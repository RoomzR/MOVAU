using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapAdmin(this WebApplication app)
    {
        var admin = app.MapGroup("/api/v1/admin").RequireStaff();
        admin.MapGet("/overview", GetAdminOverview);
        admin.MapGet("/requests", AdminListRequests);
        admin.MapPost("/requests/{id:guid}/cancel", AdminCancelRequest);
        admin.MapGet("/users", AdminListUsers);
        admin.MapGet("/users/{id:guid}", AdminGetUser);
        admin.MapPost("/users/{id:guid}/deactivate", AdminDeactivateUser);
        admin.MapPost("/users/{id:guid}/activate", AdminActivateUser);
        admin.MapPost("/users/{id:guid}/roles", AdminGrantRole).DisableAntiforgery();
        admin.MapDelete("/users/{id:guid}/roles/{role}", AdminRevokeRole);
        admin.MapGet("/disputes", AdminListDisputes);
        admin.MapPost("/disputes/{id:guid}/resolve", AdminResolveDispute);
        admin.MapGet("/events", AdminListEvents);
    }
    private static async Task<IResult> GetAdminOverview(AppDbContext db)
    {
        return Results.Json(new Contracts.AdminOverview(
            await db.IdentityVerifications.CountAsync(r => r.Status == IdentityStatus.Pending),
            await db.Disputes.CountAsync(d => d.Status == DisputeStatus.Open),
            await db.HelpRequests.CountAsync(r => r.Status == HelpRequestStatus.Open),
            await db.HelpRequests.CountAsync(r => r.Status == HelpRequestStatus.InProgress),
            await db.Users.CountAsync(),
            await db.Users.CountAsync(u => !u.IsActive)));
    }

    private static async Task<IResult> AdminListRequests(
        AppDbContext db,
        string? q,
        string? status,
        string? category,
        int limit = AdminOps.DefaultLimit,
        int offset = 0)
    {
        (limit, offset) = AdminOps.Page(limit, offset);
        var wanted = AdminOps.RequestStatus(status);
        var search = AdminOps.ClipQuery(q);
        IQueryable<HelpRequest> query = db.HelpRequests.AsNoTracking().Include(r => r.Client);
        if (wanted is not null)
        {
            query = query.Where(r => r.Status == wanted);
        }
        if (!string.IsNullOrWhiteSpace(category))
        {
            query = query.Where(r => r.Category == category);
        }
        if (search.Length > 0)
        {
            if (Guid.TryParse(search, out var id))
            {
                query = query.Where(r => r.Id == id);
            }
            else
            {
                var like = AdminOps.Like(search);
                if (like is not null)
                {
                    query = query.Where(r =>
                        EF.Functions.ILike(r.Title, like)
                        || EF.Functions.ILike(r.Client.Email, like)
                        || EF.Functions.ILike(r.Client.DisplayName, like));
                }
            }
        }
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(r => r.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        var ids = items.Select(r => r.Id).ToList();
        var holds = await db.WalletHolds.AsNoTracking()
            .Where(h => ids.Contains(h.HelpRequestId))
            .ToDictionaryAsync(h => h.HelpRequestId, h => Mapping.HoldName(h.Status));
        return Results.Json(AdminOps.Pack(
            items.Select(r => AdminOps.ToRequest(r, holds.GetValueOrDefault(r.Id))).ToList(),
            total,
            limit,
            offset));
    }

    private static async Task<IResult> AdminListUsers(
        AppDbContext db,
        string? q,
        bool? is_active,
        string? role,
        int limit = AdminOps.DefaultLimit,
        int offset = 0)
    {
        (limit, offset) = AdminOps.Page(limit, offset);
        var search = AdminOps.ClipQuery(q);
        IQueryable<User> query = db.Users.AsNoTracking().Include(u => u.Roles);
        if (is_active is not null)
        {
            query = query.Where(u => u.IsActive == is_active);
        }
        if (!string.IsNullOrWhiteSpace(role))
        {
            UserRole parsed;
            try
            {
                parsed = Mapping.ParseRole(role);
            }
            catch
            {
                throw new AppException(400, "Неизвестная роль");
            }
            query = query.Where(u => u.Roles.Any(r => r.Role == parsed));
        }
        if (search.Length > 0)
        {
            var like = AdminOps.Like(search);
            if (like is not null)
            {
                query = query.Where(u =>
                    EF.Functions.ILike(u.Email, like)
                    || EF.Functions.ILike(u.DisplayName, like)
                    || (u.Phone != null && EF.Functions.ILike(u.Phone, like)));
            }
        }
        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(u => u.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        return Results.Json(AdminOps.Pack(rows.Select(Mapping.ToAdmin).ToList(), total, limit, offset));
    }

    private static async Task<IResult> AdminGetUser(Guid id, AppDbContext db)
    {
        var found = await db.Users.AsNoTracking().Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new AppException(404, "Пользователь не найден");
        var related = db.HelpRequests.AsNoTracking().Where(r => r.ClientId == found.Id || r.ExecutorId == found.Id);
        var requestsTotal = await related.CountAsync();
        var requestsOpen = await related.CountAsync(r =>
            r.Status == HelpRequestStatus.Open
            || r.Status == HelpRequestStatus.Assigned
            || r.Status == HelpRequestStatus.InProgress);
        var requestsCompleted = await related.CountAsync(r => r.Status == HelpRequestStatus.Completed);
        var requests = await related.OrderByDescending(r => r.CreatedAt).Take(20).ToListAsync();
        var identity = await IdentityOps.OwnStatusAsync(db, found.Id);
        return Results.Json(new AdminUserDetail(
            found.Id.ToString(),
            found.Email,
            found.DisplayName,
            found.Phone,
            found.PhoneVerifiedAt is not null && found.Phone is not null,
            found.IsActive,
            found.Roles.Select(r => Mapping.RoleName(r.Role)).ToList(),
            found.CreatedAt.ToString("O"),
            identity,
            requestsTotal,
            requestsOpen,
            requestsCompleted,
            requests.Select(AdminOps.ToRef).ToList()));
    }

    private static async Task<IResult> AdminCancelRequest(
        Guid id, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var item = await LoadRequest(db, id);
        var extraUser = item.ExecutorId;
        await MarkCancelledAsync(db, item);
        db.AdminEvents.Add(AdminOps.Build(
            user.Id,
            AdminEventKind.RequestCancelled,
            "help_request",
            item.Id,
            item.Title));
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, extraUserId: extraUser);
        return Results.Json(await ToRequestDto(db, item, origin: WebOrigin(settings)));
    }

    private static async Task<IResult> AdminDeactivateUser(Guid id, User user, AppDbContext db)
    {
        if (id == user.Id)
        {
            throw new AppException(409, "Нельзя отключить себя");
        }
        var target = await db.Users.FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new AppException(404, "Пользователь не найден");
        if (!target.IsActive)
        {
            throw new AppException(409, "Уже отключён");
        }
        target.IsActive = false;
        target.UpdatedAt = DateTimeOffset.UtcNow;
        db.AdminEvents.Add(AdminOps.Build(
            user.Id,
            AdminEventKind.UserDeactivated,
            "user",
            target.Id,
            target.Email));
        await db.SaveChangesAsync();
        return Results.Json(Mapping.ToAdmin(await db.Users.Include(u => u.Roles).FirstAsync(u => u.Id == id)));
    }

    private static async Task<IResult> AdminActivateUser(Guid id, User user, AppDbContext db)
    {
        if (id == user.Id)
        {
            throw new AppException(409, "Нельзя включить себя");
        }
        var target = await db.Users.FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new AppException(404, "Пользователь не найден");
        if (target.IsActive)
        {
            throw new AppException(409, "Уже активен");
        }
        target.IsActive = true;
        target.UpdatedAt = DateTimeOffset.UtcNow;
        db.AdminEvents.Add(AdminOps.Build(
            user.Id,
            AdminEventKind.UserActivated,
            "user",
            target.Id,
            target.Email));
        await db.SaveChangesAsync();
        return Results.Json(Mapping.ToAdmin(await db.Users.Include(u => u.Roles).FirstAsync(u => u.Id == id)));
    }

    private static int ActiveRequestCap(User user) =>
        Mapping.HasRole(user, UserRole.Business) || Mapping.HasRole(user, UserRole.Admin)
            ? BusinessActiveRequests
            : MaxActiveRequests;

    private static void EnsureBusiness(User user)
    {
        if (!Mapping.HasRole(user, UserRole.Business) && !Mapping.HasRole(user, UserRole.Admin))
        {
            throw new AppException(403, "Кабинет бизнеса только для партнёра");
        }
    }

    private static UserRole ParseStaffRole(string? raw)
    {
        UserRole role;
        try
        {
            role = Mapping.ParseRole(raw ?? "");
        }
        catch
        {
            throw new AppException(400, "Неизвестная роль");
        }
        if (!StaffGrantable.Contains(role))
        {
            throw new AppException(403, "Эту роль нельзя выдать");
        }
        return role;
    }

    private static void EnsureCanAssignRole(User actor, User target, UserRole role)
    {
        if (target.Roles.Any(r => r.Role == UserRole.Admin) && !Mapping.HasRole(actor, UserRole.Admin))
        {
            throw new AppException(403, "Роли admin меняет только admin");
        }
        if (Mapping.HasRole(actor, UserRole.Admin))
        {
            return;
        }
        if (Mapping.HasRole(actor, UserRole.Moderator) && ModeratorGrantable.Contains(role))
        {
            return;
        }
        throw new AppException(403, "Недостаточно прав");
    }

    private static async Task<IResult> AdminGrantRole(Guid id, RoleChange body, User user, AppDbContext db)
    {
        if (id == user.Id)
        {
            throw new AppException(409, "Нельзя менять свои роли");
        }
        var role = ParseStaffRole(body.Role);
        var target = await db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new AppException(404, "Пользователь не найден");
        EnsureCanAssignRole(user, target, role);
        if (target.Roles.Any(r => r.Role == role))
        {
            throw new AppException(409, "Роль уже есть");
        }
        db.UserRoles.Add(new UserRoleAssignment { UserId = target.Id, Role = role });
        db.AdminEvents.Add(AdminOps.Build(
            user.Id,
            AdminEventKind.UserRoleGranted,
            "user",
            target.Id,
            Mapping.RoleName(role)));
        await db.SaveChangesAsync();
        return Results.Json(Mapping.ToAdmin(await db.Users.Include(u => u.Roles).FirstAsync(u => u.Id == id)));
    }

    private static async Task<IResult> AdminRevokeRole(Guid id, string role, User user, AppDbContext db, ShiftStore shifts)
    {
        if (id == user.Id)
        {
            throw new AppException(409, "Нельзя менять свои роли");
        }
        var parsed = ParseStaffRole(role);
        var target = await db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id)
            ?? throw new AppException(404, "Пользователь не найден");
        EnsureCanAssignRole(user, target, parsed);
        if (!target.Roles.Any(r => r.Role == parsed))
        {
            throw new AppException(409, "Этой роли нет");
        }
        await db.UserRoles.Where(r => r.UserId == id && r.Role == parsed).ExecuteDeleteAsync();
        if (parsed == UserRole.Executor)
        {
            await shifts.ClearAsync(id);
        }
        db.AdminEvents.Add(AdminOps.Build(
            user.Id,
            AdminEventKind.UserRoleRevoked,
            "user",
            id,
            Mapping.RoleName(parsed)));
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        return Results.Json(Mapping.ToAdmin(await db.Users.AsNoTracking().Include(u => u.Roles).FirstAsync(u => u.Id == id)));
    }

    private static async Task<IResult> AdminListDisputes(
        AppDbContext db,
        string? q,
        string? status,
        int limit = AdminOps.DefaultLimit,
        int offset = 0)
    {
        (limit, offset) = AdminOps.Page(limit, offset);
        var wanted = AdminOps.DisputeStatusFilter(status);
        var search = AdminOps.ClipQuery(q);
        IQueryable<Dispute> query = db.Disputes.AsNoTracking().Include(d => d.Author);
        if (wanted is not null)
        {
            query = query.Where(d => d.Status == wanted);
        }
        if (search.Length > 0)
        {
            if (Guid.TryParse(search, out var id))
            {
                query = query.Where(d => d.Id == id || d.HelpRequestId == id);
            }
            else
            {
                var like = AdminOps.Like(search);
                if (like is not null)
                {
                    query = query.Where(d =>
                        EF.Functions.ILike(d.Reason, like)
                        || EF.Functions.ILike(d.Author.DisplayName, like)
                        || (d.Resolution != null && EF.Functions.ILike(d.Resolution, like)));
                }
            }
        }
        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(d => d.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        return Results.Json(AdminOps.Pack(rows.Select(Mapping.ToPublic).ToList(), total, limit, offset));
    }

    private static async Task<IResult> AdminResolveDispute(
        Guid id, DisputeResolve body, User user, AppDbContext db, IRealtimeBus bus)
    {
        var note = body.Resolution?.Trim() ?? "";
        if (note.Length is < 3 or > 500)
        {
            throw new AppException(400, "Решение от 3 до 500 символов");
        }
        var row = await db.Disputes.Include(d => d.Author).Include(d => d.HelpRequest)
            .FirstOrDefaultAsync(d => d.Id == id)
            ?? throw new AppException(404, "Спор не найден");
        if (row.Status != DisputeStatus.Open)
        {
            throw new AppException(409, "Спор уже закрыт");
        }
        row.Status = DisputeStatus.Resolved;
        row.Resolution = note;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        db.AdminEvents.Add(AdminOps.Build(
            user.Id,
            AdminEventKind.DisputeResolved,
            "dispute",
            row.Id,
            note));
        var href = $"/requests/{row.HelpRequestId}";
        var title = row.HelpRequest.Title;
        var clientNote = NotificationOps.ForOther(
            user.Id, row.HelpRequest.ClientId, NotificationKind.DisputeResolved, title, "Спор закрыт модератором", href);
        var execNote = NotificationOps.ForOther(
            user.Id, row.HelpRequest.ExecutorId, NotificationKind.DisputeResolved, title, "Спор закрыт модератором", href);
        if (clientNote is not null)
        {
            db.Notifications.Add(clientNote);
        }
        if (execNote is not null)
        {
            db.Notifications.Add(execNote);
        }
        await db.SaveChangesAsync();
        await NotificationOps.SendAllAsync(bus, clientNote, execNote);
        return Results.Json(Mapping.ToPublic(row));
    }

    private static async Task<IResult> AdminListEvents(
        AppDbContext db,
        string? q,
        int limit = AdminOps.DefaultLimit,
        int offset = 0)
    {
        (limit, offset) = AdminOps.Page(limit, offset);
        var search = AdminOps.ClipQuery(q);
        IQueryable<AdminEvent> query = db.AdminEvents.AsNoTracking().Include(e => e.Actor);
        if (search.Length > 0)
        {
            if (Guid.TryParse(search, out var id))
            {
                query = query.Where(e => e.EntityId == id || e.ActorId == id);
            }
            else
            {
                var like = AdminOps.Like(search);
                if (like is not null)
                {
                    query = query.Where(e =>
                        EF.Functions.ILike(e.Detail, like)
                        || EF.Functions.ILike(e.Actor.DisplayName, like)
                        || EF.Functions.ILike(e.Actor.Email, like));
                }
            }
        }
        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(e => e.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        return Results.Json(AdminOps.Pack(rows.Select(AdminOps.ToPublic).ToList(), total, limit, offset));
    }
}

