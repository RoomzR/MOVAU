using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class AdminOps
{
    public const int DefaultLimit = 25;

    public static string ClipQuery(string? raw)
    {
        var value = (raw ?? "").Trim();
        return value.Length <= 80 ? value : value[..80];
    }

    public static (int Limit, int Offset) Page(int limit, int offset) =>
        (Math.Clamp(limit <= 0 ? DefaultLimit : limit, 1, 100), Math.Max(offset, 0));

    public static HelpRequestStatus? RequestStatus(string? raw)
    {
        var value = (raw ?? "").Trim().ToLowerInvariant();
        if (value.Length == 0)
        {
            return null;
        }
        return value switch
        {
            "open" => HelpRequestStatus.Open,
            "assigned" => HelpRequestStatus.Assigned,
            "in_progress" => HelpRequestStatus.InProgress,
            "completed" => HelpRequestStatus.Completed,
            "cancelled" => HelpRequestStatus.Cancelled,
            _ => throw new AppException(400, "Неизвестный статус заявки"),
        };
    }

    public static DisputeStatus? DisputeStatusFilter(string? raw)
    {
        var value = (raw ?? "").Trim().ToLowerInvariant();
        if (value.Length == 0)
        {
            return null;
        }
        return value switch
        {
            "open" => DisputeStatus.Open,
            "resolved" => DisputeStatus.Resolved,
            _ => throw new AppException(400, "Статус спора: open или resolved"),
        };
    }

    public static string? Like(string q)
    {
        var safe = new string(q.Where(c => c is not '%' and not '_' and not '\\').ToArray());
        return safe.Length == 0 ? null : "%" + safe + "%";
    }

    public static AdminPage<T> Pack<T>(List<T> items, int total, int limit, int offset) =>
        new(items, total, limit, offset);

    public static AdminEvent Build(
        Guid actorId,
        AdminEventKind kind,
        string entityType,
        Guid entityId,
        string detail) =>
        new()
        {
            ActorId = actorId,
            Kind = kind,
            EntityType = entityType,
            EntityId = entityId,
            Detail = detail.Length <= 500 ? detail : detail[..500],
            CreatedAt = DateTimeOffset.UtcNow,
        };

    public static string KindName(AdminEventKind kind) => kind switch
    {
        AdminEventKind.RequestCancelled => "request_cancelled",
        AdminEventKind.UserDeactivated => "user_deactivated",
        AdminEventKind.UserActivated => "user_activated",
        AdminEventKind.DisputeResolved => "dispute_resolved",
        AdminEventKind.IdentityReviewed => "identity_reviewed",
        AdminEventKind.UserRoleGranted => "user_role_granted",
        AdminEventKind.UserRoleRevoked => "user_role_revoked",
        _ => kind.ToString().ToLowerInvariant(),
    };

    public static AdminEventPublic ToPublic(AdminEvent row) => new(
        row.Id,
        row.ActorId,
        row.Actor.DisplayName,
        row.Actor.Email,
        KindName(row.Kind),
        row.EntityType,
        row.EntityId,
        row.Detail,
        row.CreatedAt.ToString("O"));

    public static AdminRequestPublic ToRequest(HelpRequest item, string? holdStatus) => new(
        item.Id,
        item.ClientId,
        item.Client.Email,
        item.Client.DisplayName,
        item.Title,
        item.Category,
        Mapping.StatusName(item.Status),
        item.Price,
        item.CreatedAt.ToString("O"),
        holdStatus);

    public static AdminUserRef ToRef(HelpRequest item) => new(
        item.Id,
        item.Title,
        Mapping.StatusName(item.Status));
}
