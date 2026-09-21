using Microsoft.EntityFrameworkCore;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class WalletOps
{
    public static async Task<Wallet> GetOrCreateAsync(AppDbContext db, Guid userId, DateTimeOffset now)
    {
        var wallet = await db.Wallets.FirstOrDefaultAsync(w => w.UserId == userId);
        if (wallet is null)
        {
            wallet = new Wallet { UserId = userId, Balance = 0, UpdatedAt = now };
            db.Wallets.Add(wallet);
        }
        return wallet;
    }

    /* клиент оплачивает конкретную заявку: деньги замораживаются до complete */
    public static async Task PayRequestAsync(AppDbContext db, HelpRequest item, Guid payerId)
    {
        if (item.ClientId != payerId)
        {
            throw new AppException(403, "Оплатить может только автор заявки");
        }
        if (item.Price is not > 0)
        {
            throw new AppException(400, "Эта заявка дарма — оплата не нужна");
        }
        if (item.Status is HelpRequestStatus.Cancelled or HelpRequestStatus.Completed)
        {
            throw new AppException(409, "Эту заявку нельзя оплатить");
        }
        if (await db.WalletHolds.AnyAsync(h => h.HelpRequestId == item.Id))
        {
            throw new AppException(409, "Заявка уже оплачена");
        }
        var now = DateTimeOffset.UtcNow;
        var payer = await GetOrCreateAsync(db, payerId, now);
        if (payer.Balance < item.Price.Value)
        {
            throw new AppException(409, "Недостаточно средств. Пополните кошелёк.");
        }
        payer.Balance -= item.Price.Value;
        payer.UpdatedAt = now;
        db.WalletHolds.Add(new WalletHold
        {
            HelpRequestId = item.Id,
            PayerId = payerId,
            PayeeId = item.ExecutorId,
            Amount = item.Price.Value,
            Status = WalletHoldStatus.Held,
            CreatedAt = now,
            UpdatedAt = now,
        });
        db.WalletTxns.Add(new WalletTxn
        {
            WalletUserId = payerId,
            Amount = -item.Price.Value,
            Kind = WalletTxnKind.Hold,
            HelpRequestId = item.Id,
            CreatedAt = now,
        });
    }

    /* исполнитель отказался — холд остаётся, payee снимем */
    public static async Task DetachPayeeAsync(AppDbContext db, Guid helpRequestId)
    {
        var hold = await db.WalletHolds.FirstOrDefaultAsync(h =>
            h.HelpRequestId == helpRequestId && h.Status == WalletHoldStatus.Held);
        if (hold is null)
        {
            return;
        }
        hold.PayeeId = null;
        hold.UpdatedAt = DateTimeOffset.UtcNow;
    }

    /* если ещё не оплачено — холд при назначении; если уже холд — пишем исполнителя */
    public static async Task HoldOnAcceptAsync(AppDbContext db, HelpRequest item, Guid payeeId)
    {
        var existing = await db.WalletHolds.FirstOrDefaultAsync(h => h.HelpRequestId == item.Id);
        if (existing is not null)
        {
            existing.PayeeId = payeeId;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            return;
        }
        if (item.Price is not > 0)
        {
            return;
        }
        var now = DateTimeOffset.UtcNow;
        var payer = await GetOrCreateAsync(db, item.ClientId, now);
        await GetOrCreateAsync(db, payeeId, now);
        if (payer.Balance < item.Price.Value)
        {
            throw new AppException(409, "Недостаточно средств");
        }
        payer.Balance -= item.Price.Value;
        payer.UpdatedAt = now;
        db.WalletHolds.Add(new WalletHold
        {
            HelpRequestId = item.Id,
            PayerId = item.ClientId,
            PayeeId = payeeId,
            Amount = item.Price.Value,
            Status = WalletHoldStatus.Held,
            CreatedAt = now,
            UpdatedAt = now,
        });
        db.WalletTxns.Add(new WalletTxn
        {
            WalletUserId = item.ClientId,
            Amount = -item.Price.Value,
            Kind = WalletTxnKind.Hold,
            HelpRequestId = item.Id,
            CreatedAt = now,
        });
    }

    public static async Task ReleaseOnCompleteAsync(AppDbContext db, Guid helpRequestId)
    {
        var hold = await db.WalletHolds.FirstOrDefaultAsync(h => h.HelpRequestId == helpRequestId);
        if (hold is not { Status: WalletHoldStatus.Held })
        {
            return;
        }
        var now = DateTimeOffset.UtcNow;
        if (hold.PayeeId is null)
        {
            throw new AppException(409, "Нет исполнителя для выплаты");
        }
        var payee = await GetOrCreateAsync(db, hold.PayeeId.Value, now);
        payee.Balance += hold.Amount;
        payee.UpdatedAt = now;
        hold.Status = WalletHoldStatus.Released;
        hold.UpdatedAt = now;
        db.WalletTxns.Add(new WalletTxn
        {
            WalletUserId = hold.PayeeId.Value,
            Amount = hold.Amount,
            Kind = WalletTxnKind.Release,
            HelpRequestId = helpRequestId,
            CreatedAt = now,
        });
    }

    /* исполнитель сканирует QR заявки — закрытие и выплата */
    public static async Task<HelpRequest> ClaimByScanAsync(AppDbContext db, string code, Guid executorId)
    {
        var item = await db.HelpRequests.FirstOrDefaultAsync(r => r.PaymentCode == code)
            ?? throw new AppException(404, "QR не найден");
        if (item.ExecutorId != executorId)
        {
            throw new AppException(403, "Этот QR может закрыть только назначенный исполнитель");
        }
        if (item.Status is not (HelpRequestStatus.Assigned or HelpRequestStatus.InProgress))
        {
            throw new AppException(409, "Эту заявку нельзя закрыть этим QR");
        }
        if (await db.Disputes.AnyAsync(d => d.HelpRequestId == item.Id && d.Status == DisputeStatus.Open))
        {
            throw new AppException(409, "По заявке открыт спор — выплата заморожена");
        }
        if (item.Price is > 0)
        {
            var hold = await db.WalletHolds.FirstOrDefaultAsync(h => h.HelpRequestId == item.Id);
            if (hold is not { Status: WalletHoldStatus.Held })
            {
                throw new AppException(409, "Клиент ещё не оплатил заявку");
            }
        }
        if (!await HasExecutorProofAsync(db, item))
        {
            throw new AppException(409, "Сначала отправьте фото в чат заявки");
        }
        item.Status = HelpRequestStatus.Completed;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await ReleaseOnCompleteAsync(db, item.Id);
        return item;
    }

    public static async Task RefundIfHeldAsync(AppDbContext db, Guid helpRequestId)
    {
        var hold = await db.WalletHolds.FirstOrDefaultAsync(h => h.HelpRequestId == helpRequestId);
        if (hold is not { Status: WalletHoldStatus.Held })
        {
            return;
        }
        var now = DateTimeOffset.UtcNow;
        var payer = await GetOrCreateAsync(db, hold.PayerId, now);
        payer.Balance += hold.Amount;
        payer.UpdatedAt = now;
        hold.Status = WalletHoldStatus.Refunded;
        hold.UpdatedAt = now;
        db.WalletTxns.Add(new WalletTxn
        {
            WalletUserId = hold.PayerId,
            Amount = hold.Amount,
            Kind = WalletTxnKind.Refund,
            HelpRequestId = helpRequestId,
            CreatedAt = now,
        });
    }

    public static Task<bool> HasExecutorProofAsync(AppDbContext db, HelpRequest item) =>
        item.ExecutorId is null
            ? Task.FromResult(false)
            : db.Messages.AnyAsync(m =>
                m.HelpRequestId == item.Id
                && m.AuthorId == item.ExecutorId
                && m.ImageBytes != null);
}
