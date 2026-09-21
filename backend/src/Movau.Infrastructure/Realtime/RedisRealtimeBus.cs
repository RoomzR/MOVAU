using System.Text.Json;
using StackExchange.Redis;

namespace Movau.Api.Infrastructure;

public sealed class RedisRealtimeBus(IConnectionMultiplexer mux) : IRealtimeBus
{
    public const string Channel = "movau.realtime";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    public async Task ToGroupAsync(string group, string eventName, object payload)
    {
        var envelope = new RealtimeEnvelope(eventName, group, JsonSerializer.SerializeToElement(payload, Json));
        var json = JsonSerializer.Serialize(envelope, Json);
        await mux.GetSubscriber().PublishAsync(RedisChannel.Literal(Channel), json);
    }
}

public sealed record RealtimeEnvelope(string Event, string Group, JsonElement Payload);
