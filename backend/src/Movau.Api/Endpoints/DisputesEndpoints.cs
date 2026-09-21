using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    private static void EnsureDisputeAccess(HelpRequest item, User user)
    {
        if (item.Status is HelpRequestStatus.Open or HelpRequestStatus.Cancelled)
        {
            throw new AppException(403, "Спор доступен после назначения");
        }
        if (item.ClientId != user.Id && item.ExecutorId != user.Id)
        {
            throw new AppException(403, "Спор доступен сторонам заявки");
        }
    }

    private static async Task<IResult> ListDisputes(Guid id, User user, AppDbContext db)
    {
        var item = await LoadRequest(db, id);
        EnsureDisputeAccess(item, user);
        var rows = await db.Disputes.AsNoTracking().Include(d => d.Author)
            .Where(d => d.HelpRequestId == id)
            .OrderBy(d => d.CreatedAt)
            .ToListAsync();
        return Results.Json(rows.Select(Mapping.ToPublic).ToList());
    }

    private static async Task<IResult> CreateDispute(Guid id, DisputeCreate body, User user, AppDbContext db, IRealtimeBus bus)
    {
        var reason = body.Reason?.Trim() ?? "";
        if (reason.Length is < 8 or > 500)
        {
            throw new AppException(400, "Причина спора от 8 до 500 символов");
        }
        var item = await LoadRequest(db, id);
        EnsureDisputeAccess(item, user);
        if (await db.Disputes.AnyAsync(d => d.HelpRequestId == id && d.AuthorId == user.Id && d.Status == DisputeStatus.Open))
        {
            throw new AppException(409, "Открытый спор уже есть");
        }
        var now = DateTimeOffset.UtcNow;
        var row = new Dispute
        {
            HelpRequestId = id,
            AuthorId = user.Id,
            Reason = reason,
            Status = DisputeStatus.Open,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Disputes.Add(row);
        var otherId = item.ClientId == user.Id ? item.ExecutorId : item.ClientId;
        var openedNote = NotificationOps.ForOther(
            user.Id,
            otherId,
            NotificationKind.DisputeOpened,
            item.Title,
            "Открыт спор по заявке",
            $"/requests/{item.Id}");
        if (openedNote is not null)
        {
            db.Notifications.Add(openedNote);
        }
        await db.SaveChangesAsync();
        await NotificationOps.SendAllAsync(bus, openedNote);
        row = await db.Disputes.AsNoTracking().Include(d => d.Author).FirstAsync(d => d.Id == row.Id);
        return Results.Json(Mapping.ToPublic(row), statusCode: 201);
    }
}

