using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class NotificationOps
{
    public static InboxNotification Build(
        Guid userId,
        NotificationKind kind,
        string title,
        string body,
        string href) =>
        new()
        {
            UserId = userId,
            Kind = kind,
            Title = Truncate(title, 140),
            Body = Truncate(body, 500),
            Href = Truncate(href, 255),
            CreatedAt = DateTimeOffset.UtcNow,
        };

    public static async Task PushAsync(
        AppDbContext db,
        IRealtimeBus bus,
        Guid userId,
        NotificationKind kind,
        string title,
        string body,
        string href)
    {
        var row = Build(userId, kind, title, body, href);
        db.Notifications.Add(row);
        await db.SaveChangesAsync();
        await SendAsync(bus, row);
    }

    public static async Task SendAsync(IRealtimeBus bus, InboxNotification row) =>
        await bus.ToGroupAsync($"user:{row.UserId}", "notification", ToPublic(row));

    public static NotificationPublic ToPublic(InboxNotification row) => new(
        row.Id,
        KindName(row.Kind),
        row.Title,
        row.Body,
        row.Href,
        row.ReadAt?.ToString("O"),
        row.CreatedAt.ToString("O"));

    public static string KindName(NotificationKind kind) => kind switch
    {
        NotificationKind.RequestTaken => "request_taken",
        NotificationKind.Message => "message",
        NotificationKind.IdentityReviewed => "identity_reviewed",
        NotificationKind.Offer => "offer",
        NotificationKind.RequestStarted => "request_started",
        NotificationKind.RequestCompleted => "request_completed",
        NotificationKind.PaymentReleased => "payment_released",
        NotificationKind.DisputeOpened => "dispute_opened",
        NotificationKind.DisputeResolved => "dispute_resolved",
        NotificationKind.RequestNearby => "request_nearby",
        _ => kind.ToString().ToLowerInvariant(),
    };

    public static async Task SendAllAsync(IRealtimeBus bus, params InboxNotification?[] notes)
    {
        foreach (var note in notes)
        {
            if (note is not null)
            {
                await SendAsync(bus, note);
            }
        }
    }

    public static InboxNotification? ForOther(
        Guid actorId,
        Guid? recipientId,
        NotificationKind kind,
        string title,
        string body,
        string href)
    {
        if (recipientId is not Guid id || id == actorId)
        {
            return null;
        }
        return Build(id, kind, title, body, href);
    }

    public static async Task<(List<InboxNotification> Items, int UnreadCount)> ListAsync(
        AppDbContext db,
        Guid userId,
        bool unreadOnly,
        int limit = 20)
    {
        IQueryable<InboxNotification> query = db.Notifications.AsNoTracking().Where(n => n.UserId == userId);
        if (unreadOnly)
        {
            query = query.Where(n => n.ReadAt == null);
        }
        var items = await query.OrderByDescending(n => n.CreatedAt).Take(limit).ToListAsync();
        var unread = await db.Notifications.CountAsync(n => n.UserId == userId && n.ReadAt == null);
        return (items, unread);
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];
}
