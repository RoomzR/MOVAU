using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapRequests(this WebApplication app)
    {
        var requests = app.MapGroup("/api/v1/requests");
        requests.MapGet("", ListRequests);
        requests.MapPost("", CreateRequest).RequireUser();
        requests.MapGet("/{id:guid}/matches", ListMatches).RequireUser();
        requests.MapPost("/{id:guid}/matches/{userId:guid}/click", ClickMatch).RequireUser().DisableAntiforgery();
        requests.MapPost("/{id:guid}/repeat", RepeatRequest).RequireUser().DisableAntiforgery();
        requests.MapGet("/{id:guid}/offers", ListOffers).RequireUser();
        requests.MapPost("/{id:guid}/offers", CreateOffer).RequireUser().DisableAntiforgery();
        requests.MapPost("/{id:guid}/take", TakeRequest).RequireUser().DisableAntiforgery();
        requests.MapPost("/{id:guid}/refuse", RefuseRequest).RequireUser().DisableAntiforgery();
        requests.MapPost("/{id:guid}/start", StartRequest).RequireUser();
        requests.MapPost("/{id:guid}/eta", SetEta).RequireUser().DisableAntiforgery();
        requests.MapPost("/{id:guid}/complete", CompleteRequest).RequireUser();
        requests.MapGet("/{id:guid}/messages", ListMessages).RequireUser();
        requests.MapPost("/{id:guid}/messages", CreateMessage).RequireUser();
        requests.MapGet("/{id:guid}/reviews", ListReviews).RequireUser();
        requests.MapPost("/{id:guid}/reviews", CreateReview).RequireUser();
        requests.MapGet("/{id:guid}/disputes", ListDisputes).RequireUser();
        requests.MapPost("/{id:guid}/disputes", CreateDispute).RequireUser();
        requests.MapGet("/{id:guid}/payment", GetPayment);
        requests.MapPost("/{id:guid}/pay", PayRequest).RequireUser().DisableAntiforgery();
        requests.MapPost("/{id:guid}/location", PingLocation).RequireUser().DisableAntiforgery();
        requests.MapGet("/{id:guid}/location", GetLocation).RequireUser();
        requests.MapGet("/{id:guid}", GetRequest);
        requests.MapPatch("/{id:guid}", UpdateRequest).RequireUser();
        requests.MapDelete("/{id:guid}", CancelRequest).RequireUser();
        var chatMedia = app.MapGroup("/api/v1/messages").RequireUser();
        chatMedia.MapGet("/{id:guid}/image", GetMessageImage);
    }
    private static async Task<IResult> ListRequests(
        HttpContext http,
        Settings settings,
        AppDbContext db,
        HelpRequestStatus? status,
        string? category = null,
        bool mine = false,
        double? lat = null,
        double? lng = null,
        int radius_m = 5000,
        int limit = 50,
        int offset = 0)
    {
        if (lat is null != lng is null)
        {
            throw new AppException(400, "Нужны оба параметра: lat и lng");
        }
        limit = Math.Clamp(limit, 1, 100);
        offset = Math.Max(offset, 0);
        radius_m = Math.Clamp(radius_m, 100, 50_000);

        var user = http.Items["user"] as User;
        IQueryable<HelpRequest> query = db.HelpRequests.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(category))
        {
            var key = category.Trim().ToLowerInvariant();
            if (!RequestCategories.Contains(key))
            {
                throw new AppException(400, "Неизвестная категория");
            }
            query = query.Where(r => r.Category == key);
        }
        if (mine)
        {
            if (user is null)
            {
                throw new AppException(401, "Нужна авторизация");
            }
            query = query.Where(r => r.ClientId == user.Id || r.ExecutorId == user.Id);
        }
        else if (status is not null)
        {
            query = query.Where(r => r.Status == status);
        }
        else
        {
            query = query.Where(r => r.Status == HelpRequestStatus.Open);
        }

        /* волонтёр без роли исполнителя видит только дарму */
        if (!mine && user is not null && Mapping.HasRole(user, UserRole.Volunteer) && !Mapping.HasRole(user, UserRole.Executor))
        {
            query = query.Where(r => r.Price == null);
        }

        var webOrigin = WebOrigin(settings);
        var viewerId = user?.Id;

        if (lat is not null && lng is not null)
        {
            var origin = Mapping.Point(lat.Value, lng.Value);
            var rows = await query
                .Where(r => r.Location.IsWithinDistance(origin, radius_m))
                .OrderBy(r => r.Location.Distance(origin))
                .Skip(offset)
                .Take(limit)
                .Select(r => new { Item = r, Distance = r.Location.Distance(origin) })
                .ToListAsync();
            var distances = rows.ToDictionary(r => r.Item.Id, r => (int)Math.Round(r.Distance));
            return Results.Json(await MapRequestList(db, rows.Select(r => r.Item).ToList(), viewerId, webOrigin, distances));
        }

        var items = await query.OrderByDescending(r => r.CreatedAt).Skip(offset).Take(limit).ToListAsync();
        return Results.Json(await MapRequestList(db, items, viewerId, webOrigin));
    }

    private static async Task<IResult> CreateRequest(
        HelpRequestCreate body, User user, Settings settings, AppDbContext db, ShiftStore shifts, IRealtimeBus bus)
    {
        if (body.Title is not { Length: >= 3 } || body.Description is not { Length: >= 8 })
        {
            throw new AppException(400, "Некорректная заявка");
        }
        var item = await InsertOpenRequest(db, user, body);
        WalletHold? hold = null;
        if (item.Price is > 0)
        {
            try
            {
                await WalletOps.PayRequestAsync(db, item, user.Id);
                await db.SaveChangesAsync();
                hold = await db.WalletHolds.AsNoTracking().FirstOrDefaultAsync(h => h.HelpRequestId == item.Id);
            }
            catch (AppException ex) when (ex.Status == 409)
            {
                /* QR уже есть, оплатят с кошелька позже */
            }
        }
        await PushNearbyAsync(db, shifts, bus, item, user.Id);
        return Results.Json(Mapping.ToPublicForViewer(item, null, hold, user.Id, WebOrigin(settings)), statusCode: 201);
    }

    private static async Task<IResult> RepeatRequest(
        Guid id, User user, Settings settings, AppDbContext db, ShiftStore shifts, IRealtimeBus bus)
    {
        var source = await LoadRequest(db, id);
        if (source.ClientId != user.Id)
        {
            throw new AppException(403, "Повторить можно только свою заявку");
        }
        if (source.Status != HelpRequestStatus.Completed)
        {
            throw new AppException(409, "Повтор только после выполнения");
        }
        var item = await InsertOpenRequest(db, user, new HelpRequestCreate(
            source.Title,
            source.Description,
            source.Category,
            source.Location.Y,
            source.Location.X,
            source.AddressText,
            source.Price));
        WalletHold? hold = null;
        if (item.Price is > 0)
        {
            await WalletOps.PayRequestAsync(db, item, user.Id);
            await db.SaveChangesAsync();
            hold = await db.WalletHolds.AsNoTracking().FirstOrDefaultAsync(h => h.HelpRequestId == item.Id);
        }
        await PushNearbyAsync(db, shifts, bus, item, user.Id);
        return Results.Json(Mapping.ToPublicForViewer(item, null, hold, user.Id, WebOrigin(settings)), statusCode: 201);
    }

    private static async Task<HelpRequest> InsertOpenRequest(AppDbContext db, User user, HelpRequestCreate body)
    {
        var active = await db.HelpRequests.CountAsync(r =>
            r.ClientId == user.Id
            && (r.Status == HelpRequestStatus.Open
                || r.Status == HelpRequestStatus.Assigned
                || r.Status == HelpRequestStatus.InProgress));
        if (active >= ActiveRequestCap(user))
        {
            throw new AppException(409, Mapping.HasRole(user, UserRole.Business) || Mapping.HasRole(user, UserRole.Admin)
                ? "Не больше двадцати активных заявок"
                : "Не больше трёх активных заявок");
        }
        await IdentityOps.EnsureVerified(db, user.Id);
        var now = DateTimeOffset.UtcNow;
        var item = new HelpRequest
        {
            ClientId = user.Id,
            Title = body.Title,
            Description = body.Description,
            Category = string.IsNullOrWhiteSpace(body.Category) ? "other" : body.Category,
            Status = HelpRequestStatus.Open,
            Location = Mapping.Point(body.Latitude, body.Longitude),
            AddressText = body.AddressText,
            Price = body.Price,
            PaymentCode = Mapping.NewPaymentCode(),
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.HelpRequests.Add(item);
        await db.SaveChangesAsync();
        return item;
    }

    private static async Task PushNearbyAsync(
        AppDbContext db, ShiftStore shifts, IRealtimeBus bus, HelpRequest item, Guid actorId)
    {
        var notes = await MatchOps.BuildNearbyAsync(db, shifts, item, actorId);
        if (notes.Count == 0)
        {
            return;
        }
        db.Notifications.AddRange(notes);
        await db.SaveChangesAsync();
        await NotificationOps.SendAllAsync(bus, [.. notes]);
    }

    private static async Task<IResult> ListMatches(Guid id, User user, AppDbContext db, ShiftStore shifts)
    {
        var item = await LoadRequest(db, id);
        if (item.ClientId != user.Id)
        {
            throw new AppException(403, "Подбор видит автор");
        }
        if (item.Status != HelpRequestStatus.Open)
        {
            throw new AppException(409, "Подбор только для открытой заявки");
        }
        var rows = await MatchOps.ListAsync(db, shifts, item);
        await MatchOps.RecordImpressionsAsync(db, item.Id, rows);
        await db.SaveChangesAsync();
        return Results.Json(rows);
    }

    private static async Task<IResult> ClickMatch(Guid id, Guid userId, User user, AppDbContext db)
    {
        var item = await LoadRequest(db, id);
        if (item.ClientId != user.Id)
        {
            throw new AppException(403, "Клик по подбору — только автору");
        }
        await MatchOps.RecordClickAsync(db, item.Id, userId);
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    private static async Task<HelpRequest> LoadRequest(AppDbContext db, Guid id) =>
        await db.HelpRequests.FirstOrDefaultAsync(r => r.Id == id)
        ?? throw new AppException(404, "Заявка не найдена");

    private static async Task<HelpRequestPublic> ToRequestDto(
        AppDbContext db,
        HelpRequest item,
        Guid? viewerId = null,
        string origin = "http://localhost:5173",
        int? distanceM = null,
        bool includeContact = true)
    {
        var hold = await db.WalletHolds.AsNoTracking().FirstOrDefaultAsync(h => h.HelpRequestId == item.Id);
        var proof = await WalletOps.HasExecutorProofAsync(db, item);
        string? contactPhone = null;
        bool? contactVerified = null;
        if (includeContact
            && viewerId is Guid vid
            && (vid == item.ClientId || vid == item.ExecutorId)
            && item.Status != HelpRequestStatus.Open)
        {
            var otherId = vid == item.ClientId ? item.ExecutorId : item.ClientId;
            if (otherId is Guid oid)
            {
                var other = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == oid);
                if (other is not null)
                {
                    contactVerified = other.PhoneVerifiedAt is not null && other.Phone is not null;
                    contactPhone = contactVerified == true ? other.Phone : null;
                }
            }
        }
        return Mapping.ToPublicForViewer(
            item, distanceM, hold, viewerId, origin, proof, contactPhone, contactVerified);
    }

    private static async Task<List<HelpRequestPublic>> MapRequestList(
        AppDbContext db,
        List<HelpRequest> items,
        Guid? viewerId,
        string origin,
        Dictionary<Guid, int>? distances = null)
    {
        var ids = items.Select(r => r.Id).ToList();
        var holds = ids.Count == 0
            ? new Dictionary<Guid, WalletHold>()
            : await db.WalletHolds.AsNoTracking()
                .Where(h => ids.Contains(h.HelpRequestId))
                .ToDictionaryAsync(h => h.HelpRequestId);
        return items
            .Select(r =>
            {
                int? distance = null;
                if (distances is not null && distances.TryGetValue(r.Id, out var meters))
                {
                    distance = meters;
                }
                return Mapping.ToPublicForViewer(
                    r,
                    distance,
                    holds.GetValueOrDefault(r.Id),
                    viewerId,
                    origin);
            })
            .ToList();
    }

    private static async Task<IResult> GetRequest(Guid id, HttpContext http, Settings settings, AppDbContext db)
    {
        var viewerId = http.Items["user"] is User user ? user.Id : (Guid?)null;
        return Results.Json(await ToRequestDto(db, await LoadRequest(db, id), viewerId, WebOrigin(settings)));
    }

    private static string WebOrigin(Settings settings) =>
        settings.CorsOriginList.FirstOrDefault() ?? "http://localhost:5173";

    private static bool OwnsRequest(HttpContext http, HelpRequest item) =>
        http.Items["user"] is User user && user.Id == item.ClientId;

    private static async Task<bool> CanClaimAsync(AppDbContext db, HelpRequest item, WalletHold? hold, Guid? userId)
    {
        if (userId is null || item.ExecutorId != userId)
        {
            return false;
        }
        if (item.Status is not (HelpRequestStatus.Assigned or HelpRequestStatus.InProgress))
        {
            return false;
        }
        if (await db.Disputes.AnyAsync(d => d.HelpRequestId == item.Id && d.Status == DisputeStatus.Open))
        {
            return false;
        }
        return item.Price is not > 0 || hold is { Status: WalletHoldStatus.Held };
    }

    private static async Task<IResult> UpdateRequest(
        Guid id, HelpRequestUpdate body, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var item = await LoadRequest(db, id);
        if (item.ClientId != user.Id)
        {
            throw new AppException(403, "Можно менять только свою заявку");
        }
        if (body.Status is not null && body.Status != HelpRequestStatus.Cancelled)
        {
            throw new AppException(400, "Сейчас автор может только отменить заявку");
        }
        if (body.Title is { Length: >= 3 }) item.Title = body.Title;
        if (body.Description is { Length: >= 8 }) item.Description = body.Description;
        if (body.Category is not null) item.Category = body.Category;
        if (body.AddressText is not null) item.AddressText = body.AddressText;
        if (body.Price is not null) item.Price = body.Price;
        if (body.Status != HelpRequestStatus.Cancelled)
        {
            await IdentityOps.EnsureVerified(db, user.Id);
        }
        if (body.Latitude is not null || body.Longitude is not null)
        {
            item.Location = Mapping.Point(body.Latitude ?? item.Location.Y, body.Longitude ?? item.Location.X);
        }
        var extraUser = item.ExecutorId;
        if (body.Status == HelpRequestStatus.Cancelled)
        {
            await MarkCancelledAsync(db, item);
        }
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id, extraUser);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }

    private static async Task MarkCancelledAsync(AppDbContext db, HelpRequest item)
    {
        if (!Cancelable.Contains(item.Status))
        {
            throw new AppException(409, "Эту заявку уже нельзя отменить");
        }
        item.Status = HelpRequestStatus.Cancelled;
        item.ExecutorId = null;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.Offers.Where(o => o.HelpRequestId == item.Id && o.Status == OfferStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OfferStatus.Rejected));
        await WalletOps.RefundIfHeldAsync(db, item.Id);
    }

    private static async Task<IResult> CancelRequest(
        Guid id, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var item = await LoadRequest(db, id);
        if (item.ClientId != user.Id)
        {
            throw new AppException(403, "Можно отменить только свою заявку");
        }
        var extraUser = item.ExecutorId;
        await MarkCancelledAsync(db, item);
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id, extraUser);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }

    private static async Task<IResult> ListOffers(Guid id, User user, AppDbContext db)
    {
        var item = await LoadRequest(db, id);
        IQueryable<Offer> query = db.Offers.Include(o => o.Executor).Where(o => o.HelpRequestId == id);
        if (item.ClientId == user.Id)
        {
            /* автор видит все */
        }
        else if (CanOfferOn(user, item) || Mapping.HasRole(user, UserRole.Executor) || Mapping.HasRole(user, UserRole.Volunteer))
        {
            query = query.Where(o => o.ExecutorId == user.Id);
        }
        else
        {
            throw new AppException(403, "Нет доступа к откликам");
        }
        var rows = await query.OrderBy(o => o.CreatedAt).ToListAsync();
        return Results.Json(rows.Select(Mapping.ToPublic).ToList());
    }

    private static async Task<IResult> CreateOffer(Guid id, OfferCreate? body, User user, AppDbContext db, IRealtimeBus bus)
    {
        var item = await LoadRequest(db, id);
        if (!CanOfferOn(user, item))
        {
            throw new AppException(403, item.Price is null
                ? "Отклик доступен исполнителю или волонтёру"
                : "Платные заявки — только исполнителю");
        }
        if (item.ClientId == user.Id)
        {
            throw new AppException(403, "Нельзя откликнуться на свою заявку");
        }
        if (item.Status != HelpRequestStatus.Open)
        {
            throw new AppException(409, "Заявка уже не открыта");
        }
        await IdentityOps.EnsureVerified(db, user.Id);
        var existing = await db.Offers.Include(o => o.Executor)
            .FirstOrDefaultAsync(o => o.HelpRequestId == id && o.ExecutorId == user.Id);
        InboxNotification? offerNote = null;
        if (existing is not null)
        {
            if (existing.Status == OfferStatus.Withdrawn && item.Status == HelpRequestStatus.Open)
            {
                existing.Status = OfferStatus.Pending;
                existing.Message = body?.Message;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
                offerNote = NotificationOps.ForOther(
                    user.Id,
                    item.ClientId,
                    NotificationKind.Offer,
                    item.Title,
                    $"{user.DisplayName} снова откликнулся",
                    $"/requests/{item.Id}");
                if (offerNote is not null)
                {
                    db.Notifications.Add(offerNote);
                }
                await db.SaveChangesAsync();
                await NotificationOps.SendAllAsync(bus, offerNote);
                return Results.Json(Mapping.ToPublic(existing), statusCode: 201);
            }
            throw new AppException(409, "Вы уже откликнулись");
        }
        var offer = new Offer
        {
            HelpRequestId = id,
            ExecutorId = user.Id,
            Message = body?.Message,
            Status = OfferStatus.Pending,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        db.Offers.Add(offer);
        offerNote = NotificationOps.ForOther(
            user.Id,
            item.ClientId,
            NotificationKind.Offer,
            item.Title,
            $"{user.DisplayName} откликнулся",
            $"/requests/{item.Id}");
        if (offerNote is not null)
        {
            db.Notifications.Add(offerNote);
        }
        await db.SaveChangesAsync();
        await NotificationOps.SendAllAsync(bus, offerNote);
        return Results.Json(new OfferPublic(
            offer.Id,
            id,
            user.Id,
            user.DisplayName,
            offer.Message,
            Mapping.OfferName(offer.Status),
            offer.CreatedAt.ToString("O")), statusCode: 201);
    }

    private static async Task NotifyRequestAsync(
        IRealtimeBus bus,
        AppDbContext db,
        HelpRequest item,
        Settings settings,
        Guid? viewerId = null,
        Guid? extraUserId = null)
    {
        var dto = await ToRequestDto(db, item, viewerId, WebOrigin(settings), includeContact: false);
        await bus.ToGroupAsync($"request:{item.Id}", "request_updated", dto);
        await bus.ToGroupAsync($"user:{item.ClientId}", "request_updated", dto);
        if (item.ExecutorId is Guid executorId)
        {
            await bus.ToGroupAsync($"user:{executorId}", "request_updated", dto);
        }
        if (extraUserId is Guid extra && extra != item.ClientId && extra != item.ExecutorId)
        {
            await bus.ToGroupAsync($"user:{extra}", "request_updated", dto);
        }
    }

    private static async Task AssignCoreAsync(AppDbContext db, HelpRequest item, User executor)
    {
        var now = DateTimeOffset.UtcNow;
        item.Status = HelpRequestStatus.Assigned;
        item.ExecutorId = executor.Id;
        item.UpdatedAt = now;
        var offer = await db.Offers.FirstOrDefaultAsync(o => o.HelpRequestId == item.Id && o.ExecutorId == executor.Id);
        if (offer is null)
        {
            db.Offers.Add(new Offer
            {
                HelpRequestId = item.Id,
                ExecutorId = executor.Id,
                Status = OfferStatus.Accepted,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            offer.Status = OfferStatus.Accepted;
            offer.UpdatedAt = now;
        }
        await db.Offers
            .Where(o => o.HelpRequestId == item.Id && o.ExecutorId != executor.Id && o.Status == OfferStatus.Pending)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OfferStatus.Rejected));
    }

    private static async Task<IResult> TakeRequest(
        Guid id, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        await db.Database.ExecuteSqlInterpolatedAsync($"SELECT 1 FROM help_requests WHERE id = {id} FOR UPDATE");
        var item = await LoadRequest(db, id);
        if (!CanOfferOn(user, item))
        {
            throw new AppException(403, item.Price is null
                ? "Взять может исполнитель или волонтёр"
                : "Платные заявки — только исполнителю");
        }
        if (item.Status != HelpRequestStatus.Open)
        {
            throw new AppException(409, "Уже взяли");
        }
        await IdentityOps.EnsureVerified(db, user.Id);
        try
        {
            await WalletOps.HoldOnAcceptAsync(db, item, user.Id);
        }
        catch (AppException ex) when (ex.Status == 409 && ex.Message.Contains("Недостаточно", StringComparison.Ordinal))
        {
            throw new AppException(409, "У клиента недостаточно средств");
        }
        await AssignCoreAsync(db, item, user);
        var message = new ChatMessage
        {
            HelpRequestId = item.Id,
            AuthorId = user.Id,
            Body = $"{user.DisplayName} взялся. Напишите, где встретиться.",
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Messages.Add(message);
        var takenNote = NotificationOps.Build(
            item.ClientId,
            NotificationKind.RequestTaken,
            item.Title,
            $"{user.DisplayName} взялся",
            $"/requests/{item.Id}#chat");
        db.Notifications.Add(takenNote);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        message = await db.Messages.AsNoTracking().Include(m => m.Author).FirstAsync(m => m.Id == message.Id);
        var msgDto = Mapping.ToPublic(message);
        await bus.ToGroupAsync($"request:{item.Id}", "message", msgDto);
        await NotifyRequestAsync(bus, db, item, settings, user.Id);
        await NotificationOps.SendAsync(bus, takenNote);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }

    private static async Task<IResult> RefuseRequest(
        Guid id, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var item = await LoadRequest(db, id);
        if (item.ExecutorId != user.Id)
        {
            throw new AppException(403, "Отказаться может только назначенный исполнитель");
        }
        if (item.Status is not (HelpRequestStatus.Assigned or HelpRequestStatus.InProgress))
        {
            throw new AppException(409, "Эту заявку уже нельзя отдать");
        }
        var extraUser = user.Id;
        item.Status = HelpRequestStatus.Open;
        item.ExecutorId = null;
        item.EtaAt = null;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.Offers
            .Where(o => o.HelpRequestId == item.Id && o.ExecutorId == user.Id && o.Status == OfferStatus.Accepted)
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, OfferStatus.Withdrawn)
                .SetProperty(o => o.UpdatedAt, DateTimeOffset.UtcNow));
        await WalletOps.DetachPayeeAsync(db, item.Id);
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id, extraUser);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }

    private static async Task<IResult> ListMessages(Guid id, User user, AppDbContext db)
    {
        var item = await LoadRequest(db, id);
        RequestAccess.EnsureChatAccess(item, user);
        var rows = await db.Messages.AsNoTracking()
            .Include(m => m.Author)
            .Where(m => m.HelpRequestId == id)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();
        return Results.Json(rows.Select(Mapping.ToPublic).ToList());
    }

    private static async Task<IResult> CreateMessage(
        Guid id, MessageCreate body, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var text = body.Body?.Trim() ?? "";
        var image = ImagePayload.Parse(body.Image);
        if (image is null && text.Length is < 1 or > 2000)
        {
            throw new AppException(400, "Сообщение от 1 до 2000 символов");
        }
        if (text.Length > 2000)
        {
            throw new AppException(400, "Сообщение до 2000 символов");
        }
        if (text.Length == 0)
        {
            text = "Фото к заявке";
        }
        var item = await LoadRequest(db, id);
        RequestAccess.EnsureChatAccess(item, user);
        var message = new ChatMessage
        {
            HelpRequestId = id,
            AuthorId = user.Id,
            Body = text,
            ImageBytes = image,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Messages.Add(message);
        Guid? otherId = user.Id == item.ClientId ? item.ExecutorId : item.ClientId;
        InboxNotification? chatNote = null;
        if (otherId is Guid peerId)
        {
            var preview = text.Length > 120 ? $"{text[..120]}…" : text;
            chatNote = NotificationOps.Build(
                peerId,
                NotificationKind.Message,
                item.Title,
                preview,
                $"/requests/{item.Id}#chat");
            db.Notifications.Add(chatNote);
        }
        await db.SaveChangesAsync();
        message = await db.Messages.AsNoTracking().Include(m => m.Author).FirstAsync(m => m.Id == message.Id);
        var dto = Mapping.ToPublic(message);
        await bus.ToGroupAsync($"request:{id}", "message", dto);
        if (chatNote is not null)
        {
            await NotificationOps.SendAsync(bus, chatNote);
        }
        if (image is not null)
        {
            await NotifyRequestAsync(bus, db, item, settings, user.Id);
        }
        return Results.Json(dto, statusCode: 201);
    }

    private static async Task<IResult> GetMessageImage(Guid id, User user, AppDbContext db)
    {
        var message = await db.Messages.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id)
            ?? throw new AppException(404, "Сообщение не найдено");
        if (message.ImageBytes is not { Length: > 0 })
        {
            throw new AppException(404, "Фото нет");
        }
        var item = await LoadRequest(db, message.HelpRequestId);
        RequestAccess.EnsureChatAccess(item, user);
        return Results.File(message.ImageBytes, ImagePayload.Mime(message.ImageBytes));
    }

    private static void EnsureReviewAccess(HelpRequest item, User user)
    {
        if (item.Status != HelpRequestStatus.Completed
            || item.ExecutorId is null
            || (item.ClientId != user.Id && item.ExecutorId != user.Id))
        {
            throw new AppException(403, "Оценка доступна автору и исполнителю после выполнения");
        }
    }

    private static async Task<IResult> ListReviews(Guid id, User user, AppDbContext db)
    {
        var item = await LoadRequest(db, id);
        EnsureReviewAccess(item, user);
        var rows = await db.Reviews.AsNoTracking()
            .Include(r => r.Author)
            .Where(r => r.HelpRequestId == id)
            .OrderBy(r => r.CreatedAt)
            .ToListAsync();
        return Results.Json(rows.Select(Mapping.ToPublic).ToList());
    }

    private static async Task<IResult> CreateReview(Guid id, ReviewCreate body, User user, AppDbContext db)
    {
        if (body.Score is < 1 or > 5)
        {
            throw new AppException(400, "Оценка от 1 до 5");
        }
        var comment = string.IsNullOrWhiteSpace(body.Comment) ? null : body.Comment.Trim();
        if (comment is { Length: > 500 })
        {
            throw new AppException(400, "Комментарий до 500 символов");
        }
        var item = await LoadRequest(db, id);
        EnsureReviewAccess(item, user);
        var subjectId = item.ClientId == user.Id ? item.ExecutorId!.Value : item.ClientId;
        if (subjectId == user.Id)
        {
            throw new AppException(403, "Нельзя оценить себя");
        }
        if (await db.Reviews.AnyAsync(r => r.HelpRequestId == id && r.AuthorId == user.Id))
        {
            throw new AppException(409, "Оценка уже оставлена");
        }
        var review = new Review
        {
            HelpRequestId = id,
            AuthorId = user.Id,
            SubjectId = subjectId,
            Score = body.Score,
            Comment = comment,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.Reviews.Add(review);
        await db.SaveChangesAsync();
        review = await db.Reviews.AsNoTracking().Include(r => r.Author).FirstAsync(r => r.Id == review.Id);
        return Results.Json(Mapping.ToPublic(review), statusCode: 201);
    }

    private static async Task<IResult> StartRequest(
        Guid id, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var item = await LoadRequest(db, id);
        if (item.ExecutorId != user.Id)
        {
            throw new AppException(403, "Старт доступен назначенному исполнителю");
        }
        if (item.Status != HelpRequestStatus.Assigned)
        {
            throw new AppException(409, "Заявку нельзя взять в работу");
        }
        item.Status = HelpRequestStatus.InProgress;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        var startedNote = NotificationOps.ForOther(
            user.Id,
            item.ClientId,
            NotificationKind.RequestStarted,
            item.Title,
            $"{user.DisplayName} в работе",
            $"/requests/{item.Id}");
        if (startedNote is not null)
        {
            db.Notifications.Add(startedNote);
        }
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id);
        await NotificationOps.SendAllAsync(bus, startedNote);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }

    private static async Task<IResult> SetEta(
        Guid id, EtaSet body, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        if (body.Minutes is < 3 or > 90)
        {
            throw new AppException(400, "Укажите от 3 до 90 минут");
        }
        var item = await LoadRequest(db, id);
        if (item.ExecutorId != user.Id)
        {
            throw new AppException(403, "Таймер ставит назначенный исполнитель");
        }
        if (item.Status is not (HelpRequestStatus.Assigned or HelpRequestStatus.InProgress))
        {
            throw new AppException(409, "Сначала возьмите заявку");
        }
        item.EtaAt = DateTimeOffset.UtcNow.AddMinutes(body.Minutes);
        var becameProgress = item.Status == HelpRequestStatus.Assigned;
        if (becameProgress)
        {
            item.Status = HelpRequestStatus.InProgress;
        }
        item.UpdatedAt = DateTimeOffset.UtcNow;
        InboxNotification? startedNote = null;
        if (becameProgress)
        {
            startedNote = NotificationOps.ForOther(
                user.Id,
                item.ClientId,
                NotificationKind.RequestStarted,
                item.Title,
                $"{user.DisplayName} в работе",
                $"/requests/{item.Id}");
            if (startedNote is not null)
            {
                db.Notifications.Add(startedNote);
            }
        }
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id);
        await NotificationOps.SendAllAsync(bus, startedNote);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }

    private static async Task<IResult> CompleteRequest(
        Guid id, User user, AppDbContext db, IRealtimeBus bus, Settings settings)
    {
        var item = await LoadRequest(db, id);
        if (item.ExecutorId != user.Id)
        {
            throw new AppException(403, "Завершить может назначенный исполнитель");
        }
        if (item.Status != HelpRequestStatus.InProgress)
        {
            throw new AppException(409, "Заявку нельзя завершить");
        }
        item.Status = HelpRequestStatus.Completed;
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await WalletOps.ReleaseOnCompleteAsync(db, item.Id);
        var doneNote = NotificationOps.ForOther(
            user.Id,
            item.ClientId,
            NotificationKind.RequestCompleted,
            item.Title,
            "Заявка выполнена",
            $"/requests/{item.Id}#review");
        if (doneNote is not null)
        {
            db.Notifications.Add(doneNote);
        }
        await db.SaveChangesAsync();
        await NotifyRequestAsync(bus, db, item, settings, user.Id);
        await NotificationOps.SendAllAsync(bus, doneNote);
        return Results.Json(await ToRequestDto(db, item, user.Id, WebOrigin(settings)));
    }

    private static async Task<IResult> PingLocation(
        Guid id,
        ShiftLocation body,
        User user,
        AppDbContext db,
        TrackStore tracks,
        IRealtimeBus bus,
        IHttpClientFactory http,
        Settings settings)
    {
        var item = await LoadRequest(db, id);
        if (item.ExecutorId != user.Id)
        {
            throw new AppException(403, "Точку шлёт только назначенный исполнитель");
        }
        if (item.Status is not (HelpRequestStatus.Assigned or HelpRequestStatus.InProgress))
        {
            throw new AppException(409, "Трек только у активной заявки");
        }
        var minutes = await EtaOps.MinutesAsync(
            http, settings, body.Latitude, body.Longitude, item.Location.Y, item.Location.X);
        item.EtaAt = DateTimeOffset.UtcNow.AddMinutes(minutes);
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Results.Json(await TrackOps.PingAsync(tracks, bus, item, body.Latitude, body.Longitude));
    }

    private static async Task<IResult> GetLocation(Guid id, User user, AppDbContext db, TrackStore tracks)
    {
        var item = await LoadRequest(db, id);
        if (item.ClientId != user.Id && item.ExecutorId != user.Id)
        {
            throw new AppException(403, "Трек видят автор и исполнитель");
        }
        if (item.Status is not (HelpRequestStatus.Assigned or HelpRequestStatus.InProgress))
        {
            throw new AppException(404, "Точка протухла");
        }
        var state = await tracks.GetAsync(item.Id)
            ?? throw new AppException(404, "Точка протухла");
        return Results.Json(new TrackPublic(item.Id, state.Latitude, state.Longitude, state.UpdatedAt, item.EtaAt?.ToString("O")));
    }

    private static bool CanOfferOn(User user, HelpRequest item)
    {
        if (item.ClientId == user.Id)
        {
            return false;
        }
        if (Mapping.HasRole(user, UserRole.Executor))
        {
            return true;
        }
        return Mapping.HasRole(user, UserRole.Volunteer) && item.Price is null;
    }
}

