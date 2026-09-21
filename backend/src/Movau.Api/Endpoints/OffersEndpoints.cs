using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapOffers(this WebApplication app)
    {
        var offers = app.MapGroup("/api/v1/offers");
        offers.MapPost("/{id:guid}/accept", AcceptOffer).RequireUser();
        offers.MapPost("/{id:guid}/withdraw", WithdrawOffer).RequireUser();
    }

    private static async Task<IResult> AcceptOffer(
        Guid id, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var offer = await db.Offers.Include(o => o.Executor).FirstOrDefaultAsync(o => o.Id == id)
            ?? throw new AppException(404, "Отклик не найден");
        var item = await LoadRequest(db, offer.HelpRequestId);
        if (item.ClientId != user.Id)
        {
            throw new AppException(403, "Назначить может только автор заявки");
        }
        if (item.Status != HelpRequestStatus.Open || offer.Status != OfferStatus.Pending)
        {
            throw new AppException(409, "Этот отклик нельзя назначить");
        }
        await WalletOps.HoldOnAcceptAsync(db, item, offer.ExecutorId);
        var executor = offer.Executor;
        await AssignCoreAsync(db, item, executor);
        var takenNote = NotificationOps.Build(
            offer.ExecutorId,
            NotificationKind.RequestTaken,
            item.Title,
            "Вас назначили на заявку",
            $"/requests/{item.Id}#chat");
        db.Notifications.Add(takenNote);
        await db.SaveChangesAsync();
        await db.Entry(offer).ReloadAsync();
        await db.Entry(offer).Reference(o => o.Executor).LoadAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id, offer.ExecutorId);
        await NotificationOps.SendAsync(bus, takenNote);
        return Results.Json(Mapping.ToPublic(offer));
    }

    private static async Task<IResult> WithdrawOffer(Guid id, User user, AppDbContext db)
    {
        var offer = await db.Offers.Include(o => o.Executor).FirstOrDefaultAsync(o => o.Id == id)
            ?? throw new AppException(404, "Отклик не найден");
        if (offer.ExecutorId != user.Id)
        {
            throw new AppException(403, "Отозвать можно только свой отклик");
        }
        if (offer.Status != OfferStatus.Pending)
        {
            throw new AppException(409, "Отклик уже не в ожидании");
        }
        offer.Status = OfferStatus.Withdrawn;
        offer.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Results.Json(Mapping.ToPublic(offer));
    }

    private static void RequireExecutor(User user)
    {
        if (!Mapping.HasRole(user, UserRole.Executor))
        {
            throw new AppException(403, "Смена доступна исполнителям");
        }
    }
}

