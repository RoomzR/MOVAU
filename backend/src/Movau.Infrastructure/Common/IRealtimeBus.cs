namespace Movau.Api.Infrastructure;

public interface IRealtimeBus
{
    Task ToGroupAsync(string group, string eventName, object payload);
}

public interface IConnectionReady
{
    Task<bool> PingAsync();
}
