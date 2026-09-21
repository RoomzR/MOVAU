using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;
using StackExchange.Redis;

namespace Movau.Api.Endpoints;

public static class PhoneEndpoints
{
    public static void MapPhone(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/phone").RequireUser();
        group.MapPost("/send", Send).DisableAntiforgery();
        group.MapPost("/confirm", Confirm).DisableAntiforgery();
    }

    private static async Task<IResult> Send(
        PhoneSend body, User user, AppDbContext db, IConnectionMultiplexer redis)
    {
        var phone = PhoneOps.Normalize(body.Phone);
        await PhoneOps.EnsureUniqueAsync(db, phone, user.Id);
        await PhoneOps.StorePendingAsync(redis, user.Id, phone);
        return Results.Json(new PhoneSendResult(PhoneOps.DemoCode));
    }

    private static async Task<IResult> Confirm(
        PhoneConfirm body, User user, AppDbContext db, IConnectionMultiplexer redis)
    {
        var phone = await PhoneOps.TakePendingAsync(redis, user.Id, body.Code ?? "");
        var current = await db.Users.Include(u => u.Roles).FirstAsync(u => u.Id == user.Id);
        await PhoneOps.EnsureUniqueAsync(db, phone, current.Id);
        current.Phone = phone;
        current.PhoneVerifiedAt = DateTimeOffset.UtcNow;
        current.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        return Results.Json(await Mapping.ToPublicAsync(current, db));
    }
}
