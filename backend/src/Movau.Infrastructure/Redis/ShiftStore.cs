using System.Text.Json;
using StackExchange.Redis;

namespace Movau.Api.Infrastructure;

public class ShiftStore(IConnectionMultiplexer redis)
{
    private const int TtlSeconds = 90;
    private const string OnlineKey = "shift:online";

    public async Task<ShiftState> GetAsync(Guid userId)
    {
        var raw = await redis.GetDatabase().StringGetAsync($"shift:{userId}");
        if (raw.IsNullOrEmpty)
        {
            return new ShiftState(false, null, null, null);
        }
        var body = JsonSerializer.Deserialize<ShiftBody>(raw!)!;
        return new ShiftState(true, body.Latitude, body.Longitude, body.UpdatedAt);
    }

    public async Task<ShiftState> SetAsync(Guid userId, double lat, double lng)
    {
        var updated = DateTimeOffset.UtcNow.ToString("O");
        var json = JsonSerializer.Serialize(new ShiftBody(lat, lng, updated));
        var db = redis.GetDatabase();
        await db.StringSetAsync($"shift:{userId}", json, TimeSpan.FromSeconds(TtlSeconds));
        await db.SetAddAsync(OnlineKey, userId.ToString());
        return new ShiftState(true, lat, lng, updated);
    }

    public async Task<ShiftState> ClearAsync(Guid userId)
    {
        var db = redis.GetDatabase();
        await db.KeyDeleteAsync($"shift:{userId}");
        await db.SetRemoveAsync(OnlineKey, userId.ToString());
        return new ShiftState(false, null, null, null);
    }

    public async Task<List<(Guid UserId, ShiftState State)>> ListOnlineAsync()
    {
        var db = redis.GetDatabase();
        var members = await db.SetMembersAsync(OnlineKey);
        var rows = new List<(Guid, ShiftState)>();
        foreach (var member in members)
        {
            if (!Guid.TryParse(member.ToString(), out var userId))
            {
                continue;
            }
            var state = await GetAsync(userId);
            if (!state.OnShift || state.Latitude is null || state.Longitude is null)
            {
                await db.SetRemoveAsync(OnlineKey, userId.ToString());
                continue;
            }
            rows.Add((userId, state));
        }
        return rows;
    }

    private record ShiftBody(double Latitude, double Longitude, string UpdatedAt);
}

public record ShiftState(bool OnShift, double? Latitude, double? Longitude, string? UpdatedAt);
