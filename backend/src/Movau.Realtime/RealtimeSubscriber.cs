using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Movau.Api.Hubs;
using Movau.Api.Infrastructure;
using StackExchange.Redis;

namespace Movau.Realtime;

public sealed class RealtimeSubscriber(IConnectionMultiplexer mux, IHubContext<ChatHub> hub) : BackgroundService
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var subscriber = mux.GetSubscriber();
        await subscriber.SubscribeAsync(RedisChannel.Literal(RedisRealtimeBus.Channel), async (_, value) =>
        {
            if (value.IsNullOrEmpty)
            {
                return;
            }
            try
            {
                var envelope = JsonSerializer.Deserialize<RealtimeEnvelope>(value!, Json);
                if (envelope is null || string.IsNullOrEmpty(envelope.Group) || string.IsNullOrEmpty(envelope.Event))
                {
                    return;
                }
                await hub.Clients.Group(envelope.Group).SendAsync(envelope.Event, envelope.Payload, stoppingToken);
            }
            catch
            {
                /* битый пакет не валит подписчика */
            }
        });
        try
        {
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            /* стоп */
        }
    }
}
