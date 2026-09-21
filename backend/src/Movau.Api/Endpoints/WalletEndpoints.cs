using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapWallet(this WebApplication app)
    {
        var wallet = app.MapGroup("/api/v1/wallet").RequireUser();
        wallet.MapGet("/me", WalletMe);
        wallet.MapPost("/topup", WalletTopup).DisableAntiforgery();
    }

    private static async Task<IResult> WalletMe(User user, AppDbContext db)
    {
        var now = DateTimeOffset.UtcNow;
        var wallet = await WalletOps.GetOrCreateAsync(db, user.Id, now);
        if (db.Entry(wallet).State == EntityState.Added)
        {
            await db.SaveChangesAsync();
        }
        var holds = await db.WalletHolds.AsNoTracking()
            .Where(h => h.PayerId == user.Id || h.PayeeId == user.Id)
            .OrderByDescending(h => h.CreatedAt)
            .Take(20)
            .ToListAsync();
        var txns = await db.WalletTxns.AsNoTracking()
            .Where(t => t.WalletUserId == user.Id)
            .OrderByDescending(t => t.CreatedAt)
            .Take(20)
            .ToListAsync();
        return Results.Json(new Contracts.WalletMe(
            wallet.Balance,
            wallet.UpdatedAt.ToString("O"),
            holds.Select(Mapping.ToPublic).ToList(),
            txns.Select(Mapping.ToPublic).ToList()));
    }

    private static async Task<IResult> WalletTopup(Contracts.WalletTopup body, User user, AppDbContext db)
    {
        if (body.Amount is < 1 or > 10000)
        {
            throw new AppException(400, "Сумма пополнения от 1 до 10000");
        }
        var now = DateTimeOffset.UtcNow;
        var wallet = await WalletOps.GetOrCreateAsync(db, user.Id, now);
        wallet.Balance += body.Amount;
        wallet.UpdatedAt = now;
        db.WalletTxns.Add(new WalletTxn
        {
            WalletUserId = user.Id,
            Amount = body.Amount,
            Kind = WalletTxnKind.Topup,
            CreatedAt = now,
        });
        await db.SaveChangesAsync();
        return Results.Json(new Contracts.WalletMe(
            wallet.Balance,
            wallet.UpdatedAt.ToString("O"),
            [],
            []));
    }
}

