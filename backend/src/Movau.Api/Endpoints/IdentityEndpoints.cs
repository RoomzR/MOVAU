using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static class IdentityEndpoints
{
    public static void MapIdentity(this WebApplication app)
    {
        var mine = app.MapGroup("/api/v1/identity").RequireUser();
        mine.MapGet("/me", GetMine);
        mine.MapPost("/me", SubmitMine).DisableAntiforgery();
        mine.MapGet("/me/document", GetMineDocument);
        mine.MapGet("/me/selfie", GetMineSelfie);

        var admin = app.MapGroup("/api/v1/admin/identity").RequireStaff();
        admin.MapGet("", AdminList);
        admin.MapGet("/{id:guid}/document", AdminDocument);
        admin.MapGet("/{id:guid}/selfie", AdminSelfie);
        admin.MapPost("/{id:guid}/review", AdminReview).DisableAntiforgery();
    }

    private static async Task<IResult> GetMine(User user, AppDbContext db)
    {
        var row = await db.IdentityVerifications.AsNoTracking().FirstOrDefaultAsync(item => item.UserId == user.Id);
        return Results.Json(ToMine(row));
    }

    private static async Task<IResult> SubmitMine(IdentitySubmit body, User user, AppDbContext db)
    {
        var kind = IdentityOps.ParseKind(body.DocumentKind);
        var name = IdentityOps.RequireName(body.FullName);
        var personal = IdentityOps.RequirePersonal(body.PersonalNumber);
        var hash = IdentityOps.HashPersonal(personal);
        var documentNumber = IdentityOps.RequireDocumentNumber(body.DocumentNumber);
        var document = IdentityOps.RequirePhoto(body.Document, "разворот");
        var selfie = IdentityOps.RequirePhoto(body.Selfie, "селфи");
        await IdentityOps.EnsurePersonalFreeAsync(db, hash, user.Id);

        var now = DateTimeOffset.UtcNow;
        var row = await db.IdentityVerifications.FirstOrDefaultAsync(item => item.UserId == user.Id);
        if (row is { Status: IdentityStatus.Verified })
        {
            throw new AppException(409, "Личность уже подтверждена");
        }
        if (row is null)
        {
            row = new IdentityVerification { UserId = user.Id, CreatedAt = now };
            db.IdentityVerifications.Add(row);
        }
        row.DocumentKind = kind;
        row.FullName = name;
        row.PersonalNumber = personal;
        row.PersonalHash = hash;
        row.DocumentNumber = documentNumber;
        row.DocumentBytes = document;
        row.SelfieBytes = selfie;
        row.Status = IdentityStatus.Pending;
        row.RejectReason = null;
        row.ReviewedBy = null;
        row.ReviewedAt = null;
        row.UpdatedAt = now;
        await db.SaveChangesAsync();
        return Results.Json(ToMine(row), statusCode: 201);
    }

    private static async Task<IResult> GetMineDocument(User user, AppDbContext db)
    {
        var row = await LoadMine(db, user.Id);
        if (row.DocumentBytes is not { Length: > 0 })
        {
            throw new AppException(404, "Фото документа нет");
        }
        return Results.File(row.DocumentBytes, ImagePayload.Mime(row.DocumentBytes));
    }

    private static async Task<IResult> GetMineSelfie(User user, AppDbContext db)
    {
        var row = await LoadMine(db, user.Id);
        if (row.SelfieBytes is not { Length: > 0 })
        {
            throw new AppException(404, "Селфи нет");
        }
        return Results.File(row.SelfieBytes, ImagePayload.Mime(row.SelfieBytes));
    }

    private static async Task<IResult> AdminList(
        AppDbContext db,
        string? q,
        string? status,
        int limit = AdminOps.DefaultLimit,
        int offset = 0)
    {
        (limit, offset) = AdminOps.Page(limit, offset);
        var wanted = IdentityOps.ParseStatus(status);
        var search = AdminOps.ClipQuery(q);
        IQueryable<IdentityVerification> query = db.IdentityVerifications.AsNoTracking()
            .Include(item => item.User)
            .Where(item => item.Status == wanted);
        if (search.Length > 0)
        {
            var like = AdminOps.Like(search);
            if (like is not null)
            {
                query = query.Where(item =>
                    EF.Functions.ILike(item.User.Email, like)
                    || EF.Functions.ILike(item.User.DisplayName, like)
                    || EF.Functions.ILike(item.FullName, like));
            }
        }
        var total = await query.CountAsync();
        List<IdentityVerification> rows;
        if (wanted == IdentityStatus.Pending)
        {
            rows = await query.OrderBy(item => item.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        }
        else
        {
            rows = await query.OrderByDescending(item => item.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        }
        return Results.Json(AdminOps.Pack(rows.Select(ToAdmin).ToList(), total, limit, offset));
    }

    private static async Task<IResult> AdminDocument(Guid id, AppDbContext db)
    {
        var row = await LoadAdmin(db, id);
        if (row.DocumentBytes is not { Length: > 0 })
        {
            throw new AppException(404, "Фото документа нет");
        }
        return Results.File(row.DocumentBytes, ImagePayload.Mime(row.DocumentBytes));
    }

    private static async Task<IResult> AdminSelfie(Guid id, AppDbContext db)
    {
        var row = await LoadAdmin(db, id);
        if (row.SelfieBytes is not { Length: > 0 })
        {
            throw new AppException(404, "Селфи нет");
        }
        return Results.File(row.SelfieBytes, ImagePayload.Mime(row.SelfieBytes));
    }

    private static async Task<IResult> AdminReview(
        Guid id, IdentityReview body, User user, AppDbContext db, IRealtimeBus bus)
    {
        var row = await db.IdentityVerifications.Include(item => item.User).FirstOrDefaultAsync(item => item.Id == id)
            ?? throw new AppException(404, "Заявка на проверку не найдена");
        if (row.Status != IdentityStatus.Pending)
        {
            throw new AppException(409, "Эту заявку уже разобрали");
        }
        var decision = (body.Decision ?? "").Trim().ToLowerInvariant();
        var now = DateTimeOffset.UtcNow;
        if (decision is "verified")
        {
            await IdentityOps.EnsurePersonalFreeAsync(db, row.PersonalHash, row.UserId);
            row.Status = IdentityStatus.Verified;
            row.RejectReason = null;
        }
        else if (decision is "rejected")
        {
            var reason = (body.Reason ?? "").Trim();
            if (reason.Length is < 3 or > 500)
            {
                throw new AppException(400, "Причина отказа от 3 до 500 символов");
            }
            row.Status = IdentityStatus.Rejected;
            row.RejectReason = reason;
        }
        else
        {
            throw new AppException(400, "Нужно verified или rejected");
        }
        row.ReviewedBy = user.Id;
        row.ReviewedAt = now;
        row.UpdatedAt = now;
        var noteBody = row.Status == IdentityStatus.Verified
            ? "Можно создавать и брать заявки"
            : row.RejectReason ?? "Отклонено";
        var noteTitle = row.Status == IdentityStatus.Verified
            ? "Личность подтверждена"
            : "Личность не подтверждена";
        var note = NotificationOps.Build(
            row.UserId,
            NotificationKind.IdentityReviewed,
            noteTitle,
            noteBody,
            "/me/verify");
        db.Notifications.Add(note);
        db.AdminEvents.Add(AdminOps.Build(
            user.Id,
            AdminEventKind.IdentityReviewed,
            "identity",
            row.Id,
            row.Status == IdentityStatus.Verified ? "verified" : row.RejectReason ?? "rejected"));
        await db.SaveChangesAsync();
        await NotificationOps.SendAsync(bus, note);
        return Results.Json(ToAdmin(row));
    }

    private static async Task<IdentityVerification> LoadMine(AppDbContext db, Guid userId) =>
        await db.IdentityVerifications.AsNoTracking().FirstOrDefaultAsync(item => item.UserId == userId)
        ?? throw new AppException(404, "Заявки на проверку нет");

    private static async Task<IdentityVerification> LoadAdmin(AppDbContext db, Guid id) =>
        await db.IdentityVerifications.AsNoTracking().FirstOrDefaultAsync(item => item.Id == id)
        ?? throw new AppException(404, "Заявка на проверку не найдена");

    private static IdentityMe ToMine(IdentityVerification? row)
    {
        if (row is null)
        {
            return new IdentityMe("none", null, null, null, null, null, false, false);
        }
        return new IdentityMe(
            IdentityOps.StatusName(row.Status),
            IdentityOps.KindName(row.DocumentKind),
            row.FullName,
            IdentityOps.MaskPersonal(row.PersonalNumber),
            row.DocumentNumber,
            row.RejectReason,
            row.DocumentBytes is { Length: > 0 },
            row.SelfieBytes is { Length: > 0 });
    }

    private static AdminIdentityPublic ToAdmin(IdentityVerification row) => new(
        row.Id,
        row.UserId,
        row.User.Email,
        row.User.DisplayName,
        IdentityOps.KindName(row.DocumentKind),
        row.FullName,
        row.PersonalNumber,
        row.DocumentNumber,
        IdentityOps.StatusName(row.Status),
        row.RejectReason,
        row.CreatedAt.ToString("O"),
        row.DocumentBytes is { Length: > 0 },
        row.SelfieBytes is { Length: > 0 },
        row.ReviewedAt?.ToString("O"));
}
