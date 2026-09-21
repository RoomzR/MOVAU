using System.Text.Json;
using StackExchange.Redis;

namespace Movau.Api.Infrastructure;

public class TrackStore(IConnectionMultiplexer redis)
{
    private const int TtlSeconds = 90;

    public async Task<TrackState?> GetAsync(Guid requestId)
    {
        var raw = await redis.GetDatabase().StringGetAsync($"track:{requestId}");
        if (raw.IsNullOrEmpty)
        {
            return null;
        }
        var body = JsonSerializer.Deserialize<TrackBody>(raw!)!;
        return new TrackState(body.Latitude, body.Longitude, body.UpdatedAt);
    }

    public async Task<TrackState> SetAsync(Guid requestId, double lat, double lng)
    {
        var updated = DateTimeOffset.UtcNow.ToString("O");
        var json = JsonSerializer.Serialize(new TrackBody(lat, lng, updated));
        await redis.GetDatabase().StringSetAsync($"track:{requestId}", json, TimeSpan.FromSeconds(TtlSeconds));
        return new TrackState(lat, lng, updated);
    }

    private record TrackBody(double Latitude, double Longitude, string UpdatedAt);
}

public record TrackState(double Latitude, double Longitude, string UpdatedAt);
