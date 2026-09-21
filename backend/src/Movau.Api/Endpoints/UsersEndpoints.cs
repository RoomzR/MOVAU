using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapUsers(this WebApplication app)
    {
        var users = app.MapGroup("/api/v1/users");
        users.MapGet("/me", GetMe).RequireUser();
        users.MapPatch("/me", PatchMe).RequireUser();
        users.MapPost("/me/roles", AddRole).RequireUser();
        users.MapDelete("/me/roles/{role}", RemoveRole).RequireUser();
        users.MapGet("/{id:guid}", GetProfile);
        users.MapGet("/{id:guid}/reviews", ListUserReviews);
    }

    private static async Task<IResult> GetMe(User user, AppDbContext db) =>
        Results.Json(await Mapping.ToPublicAsync(user, db));

    private static async Task<IResult> PatchMe(UserUpdate body, User user, AppDbContext db)
    {
        var current = await db.Users.Include(u => u.Roles).FirstAsync(u => u.Id == user.Id);
        db.Entry(current).State = EntityState.Modified;
        if (body.DisplayName is { Length: >= 2 })
        {
            current.DisplayName = body.DisplayName;
        }
        if (body.Phone is not null)
        {
            var phone = body.Phone == "" ? null : PhoneOps.Normalize(body.Phone);
            if (phone is not null && await db.Users.AnyAsync(u => u.Phone == phone && u.Id != current.Id))
            {
                throw new AppException(409, "Телефон уже занят");
            }
            if (current.Phone != phone)
            {
                current.PhoneVerifiedAt = null;
            }
            current.Phone = phone;
        }
        if (body.Bio is not null)
        {
            current.Bio = body.Bio == "" ? null : body.Bio;
        }
        if (body.Skills is not null)
        {
            current.Skills = body.Skills == "" ? null : body.Skills;
        }
        current.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Results.Json(await Mapping.ToPublicAsync(current, db));
    }

    private static async Task<IResult> AddRole(RoleChange body, User user, AppDbContext db)
    {
        UserRole role;
        try
        {
            role = Mapping.ParseRole(body.Role);
        }
        catch
        {
            throw new AppException(400, "Неизвестная роль");
        }
        if (!SelfRoles.Contains(role))
        {
            throw new AppException(403, "Эту роль нельзя назначить себе");
        }
        if (!await db.UserRoles.AnyAsync(r => r.UserId == user.Id && r.Role == role))
        {
            db.UserRoles.Add(new UserRoleAssignment { UserId = user.Id, Role = role });
            await db.SaveChangesAsync();
        }
        var current = await db.Users.AsNoTracking().Include(u => u.Roles).FirstAsync(u => u.Id == user.Id);
        return Results.Json(await Mapping.ToPublicAsync(current, db));
    }

    private static async Task<IResult> RemoveRole(string role, User user, AppDbContext db, ShiftStore shifts)
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
        if (!SelfRoles.Contains(parsed))
        {
            throw new AppException(403, "Эту роль нельзя снять");
        }
        await db.UserRoles.Where(r => r.UserId == user.Id && r.Role == parsed).ExecuteDeleteAsync();
        if (parsed == UserRole.Executor)
        {
            await shifts.ClearAsync(user.Id);
        }
        var current = await db.Users.AsNoTracking().Include(u => u.Roles).FirstAsync(u => u.Id == user.Id);
        return Results.Json(await Mapping.ToPublicAsync(current, db));
    }

    private static async Task<IResult> GetProfile(Guid id, AppDbContext db)
    {
        var found = await db.Users.Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == id && u.IsActive);
        if (found is null)
        {
            throw new AppException(404, "Пользователь не найден");
        }
        return Results.Json(await Mapping.ToCardAsync(found, db));
    }

    private static async Task<IResult> ListUserReviews(Guid id, AppDbContext db)
    {
        var exists = await db.Users.AnyAsync(u => u.Id == id && u.IsActive);
        if (!exists)
        {
            throw new AppException(404, "Пользователь не найден");
        }
        var rows = await db.Reviews.AsNoTracking()
            .Include(r => r.Author)
            .Where(r => r.SubjectId == id)
            .OrderByDescending(r => r.CreatedAt)
            .Take(20)
            .ToListAsync();
        return Results.Json(rows.Select(Mapping.ToPublic).ToList());
    }
}

