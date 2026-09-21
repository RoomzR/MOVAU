using StackExchange.Redis;

namespace Movau.Api.Infrastructure;

public sealed class RedisReady(IConnectionMultiplexer mux) : IConnectionReady
{
    public async Task<bool> PingAsync()
    {
        try
        {
            await mux.GetDatabase().PingAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }
}
