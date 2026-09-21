using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static class NotificationEndpoints
{
    public static void MapNotifications(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/notifications").RequireUser();
        group.MapGet("", ListMine);
        group.MapPost("/read-all", ReadAll);
        group.MapPost("/{id:guid}/read", ReadOne);
    }

    private static async Task<IResult> ListMine(User user, AppDbContext db, bool unread = false)
    {
        var (items, count) = await NotificationOps.ListAsync(db, user.Id, unread);
        return Results.Json(new NotificationList(items.Select(NotificationOps.ToPublic).ToList(), count));
    }

    private static async Task<IResult> ReadOne(Guid id, User user, AppDbContext db)
    {
        var row = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == user.Id)
            ?? throw new AppException(404, "Уведомление не найдено");
        row.ReadAt ??= DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        var unread = await db.Notifications.CountAsync(n => n.UserId == user.Id && n.ReadAt == null);
        return Results.Json(new NotificationList([NotificationOps.ToPublic(row)], unread));
    }

    private static async Task<IResult> ReadAll(User user, AppDbContext db)
    {
        var now = DateTimeOffset.UtcNow;
        await db.Notifications
            .Where(n => n.UserId == user.Id && n.ReadAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.ReadAt, now));
        return Results.Json(new NotificationList([], 0));
    }
}
