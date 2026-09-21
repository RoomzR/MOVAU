using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapPayments(this WebApplication app)
    {
        var payments = app.MapGroup("/api/v1/payments");
        payments.MapGet("/scan/{code}", PreviewScan);
        payments.MapPost("/claim", ClaimScan).RequireUser().DisableAntiforgery();
    }

    private static async Task<IResult> GetPayment(Guid id, HttpContext http, Settings settings, AppDbContext db)
    {
        var item = await LoadRequest(db, id);
        var hold = await db.WalletHolds.AsNoTracking().FirstOrDefaultAsync(h => h.HelpRequestId == id);
        return Results.Json(Mapping.ToPayment(item, hold, OwnsRequest(http, item), WebOrigin(settings)));
    }

    private static async Task<IResult> PayRequest(
        Guid id, User user, Settings settings, AppDbContext db, IRealtimeBus bus)
    {
        var item = await LoadRequest(db, id);
        await WalletOps.PayRequestAsync(db, item, user.Id);
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id);
        var hold = await db.WalletHolds.AsNoTracking().FirstAsync(h => h.HelpRequestId == id);
        return Results.Json(Mapping.ToPayment(item, hold, true, WebOrigin(settings)));
    }

    private static async Task<IResult> PreviewScan(string code, HttpContext http, AppDbContext db)
    {
        var item = await db.HelpRequests.AsNoTracking().FirstOrDefaultAsync(r => r.PaymentCode == code)
            ?? throw new AppException(404, "QR не найден");
        var hold = await db.WalletHolds.AsNoTracking().FirstOrDefaultAsync(h => h.HelpRequestId == item.Id);
        var userId = http.Items["user"] is User user ? user.Id : (Guid?)null;
        var needsPhoto = item.ExecutorId is not null && !await WalletOps.HasExecutorProofAsync(db, item);
        var claimable = await CanClaimAsync(db, item, hold, userId) && !needsPhoto;
        return Results.Json(Mapping.ToScanPreview(item, hold, claimable, needsPhoto));
    }

    private static async Task<IResult> ClaimScan(
        ScanClaim body, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var code = body.Code?.Trim().ToLowerInvariant() ?? "";
        if (code.Length is < 16 or > 32)
        {
            throw new AppException(400, "Некорректный QR");
        }
        var item = await WalletOps.ClaimByScanAsync(db, code, user.Id);
        var payKind = item.Price is > 0 ? NotificationKind.PaymentReleased : NotificationKind.RequestCompleted;
        var payBody = item.Price is > 0 ? "Оплата ушла исполнителю" : "Заявка закрыта по QR";
        var payNote = NotificationOps.ForOther(
            user.Id,
            item.ClientId,
            payKind,
            item.Title,
            payBody,
            $"/requests/{item.Id}");
        if (payNote is not null)
        {
            db.Notifications.Add(payNote);
        }
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id);
        await NotificationOps.SendAllAsync(bus, payNote);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }
}

