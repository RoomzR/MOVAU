using Microsoft.AspNetCore.SignalR;
using Movau.Api.Hubs;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public sealed class SignalRRealtimeBus(IHubContext<ChatHub> hub) : IRealtimeBus
{
    public Task ToGroupAsync(string group, string eventName, object payload) =>
        hub.Clients.Group(group).SendAsync(eventName, payload);
}
