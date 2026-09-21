using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapBusiness(this WebApplication app)
    {
        app.MapGet("/api/v1/business/me", BusinessMe).RequireUser();
        app.MapGet("/api/v1/business/requests", BusinessListRequests).RequireUser();
        app.MapPost("/api/v1/business/requests", BusinessCreateBatch).RequireUser().DisableAntiforgery();
    }

    private static async Task<IResult> BusinessMe(User user, AppDbContext db)
    {
        EnsureBusiness(user);
        var rows = await db.HelpRequests.AsNoTracking().Where(r => r.ClientId == user.Id).ToListAsync();
        var ids = rows.Select(r => r.Id).ToList();
        var holds = await db.WalletHolds.AsNoTracking().Where(h => ids.Contains(h.HelpRequestId)).ToListAsync();
        return Results.Json(new BusinessStats(
            rows.Count,
            rows.Count(r => r.Status == HelpRequestStatus.Completed),
            holds.Where(h => h.Status == WalletHoldStatus.Released).Sum(h => h.Amount),
            holds.Where(h => h.Status == WalletHoldStatus.Held).Sum(h => h.Amount)));
    }

    private static async Task<IResult> BusinessListRequests(
        User user,
        AppDbContext db,
        string? q,
        string? status,
        int limit = AdminOps.DefaultLimit,
        int offset = 0)
    {
        EnsureBusiness(user);
        (limit, offset) = AdminOps.Page(limit, offset);
        var wanted = AdminOps.RequestStatus(status);
        var search = AdminOps.ClipQuery(q);
        IQueryable<HelpRequest> query = db.HelpRequests.AsNoTracking().Where(r => r.ClientId == user.Id);
        if (wanted is not null)
        {
            query = query.Where(r => r.Status == wanted);
        }
        if (search.Length > 0)
        {
            var like = AdminOps.Like(search);
            if (like is not null)
            {
                query = query.Where(r => EF.Functions.ILike(r.Title, like)
                    || (r.AddressText != null && EF.Functions.ILike(r.AddressText, like)));
            }
        }
        var total = await query.CountAsync();
        var rows = await query.OrderByDescending(r => r.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        return Results.Json(AdminOps.Pack(rows.Select(r => Mapping.ToPublic(r)).ToList(), total, limit, offset));
    }

    private static async Task<IResult> BusinessCreateBatch(
        BusinessBatchCreate body, User user, Settings settings, AppDbContext db)
    {
        EnsureBusiness(user);
        var items = body.Items ?? [];
        if (items.Count is < 2 or > 8)
        {
            throw new AppException(400, "Пакет: от 2 до 8 заявок");
        }
        foreach (var row in items)
        {
            if (row.Title is not { Length: >= 3 } || row.Description is not { Length: >= 8 })
            {
                throw new AppException(400, "Некорректная заявка");
            }
        }
        await IdentityOps.EnsureVerified(db, user.Id);
        var active = await db.HelpRequests.CountAsync(r =>
            r.ClientId == user.Id
            && (r.Status == HelpRequestStatus.Open
                || r.Status == HelpRequestStatus.Assigned
                || r.Status == HelpRequestStatus.InProgress));
        if (active + items.Count > ActiveRequestCap(user))
        {
            throw new AppException(409, "Не больше двадцати активных заявок");
        }
        var due = items.Where(r => r.Price is > 0).Sum(r => r.Price!.Value);
        var now = DateTimeOffset.UtcNow;
        await using var tx = await db.Database.BeginTransactionAsync();
        if (due > 0)
        {
            var wallet = await WalletOps.GetOrCreateAsync(db, user.Id, now);
            if (wallet.Balance < due)
            {
                throw new AppException(409, "Недостаточно средств. Пополните кошелёк.");
            }
        }
        var created = new List<HelpRequest>();
        foreach (var row in items)
        {
            var item = new HelpRequest
            {
                ClientId = user.Id,
                Title = row.Title,
                Description = row.Description,
                Category = string.IsNullOrWhiteSpace(row.Category) ? "other" : row.Category,
                Status = HelpRequestStatus.Open,
                Location = Mapping.Point(row.Latitude, row.Longitude),
                AddressText = row.AddressText,
                Price = row.Price,
                PaymentCode = Mapping.NewPaymentCode(),
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.HelpRequests.Add(item);
            created.Add(item);
        }
        await db.SaveChangesAsync();
        foreach (var item in created.Where(r => r.Price is > 0))
        {
            await WalletOps.PayRequestAsync(db, item, user.Id);
        }
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        var origin = WebOrigin(settings);
        var dtos = new List<HelpRequestPublic>();
        foreach (var item in created)
        {
            dtos.Add(await ToRequestDto(db, item, user.Id, origin));
        }
        return Results.Json(dtos, statusCode: 201);
    }
}

