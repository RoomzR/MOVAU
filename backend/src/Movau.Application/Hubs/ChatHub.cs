using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Hubs;

public class ChatHub(AppDbContext db) : Hub
{
    public override async Task OnConnectedAsync()
    {
        var user = Context.GetHttpContext()?.Items["user"] as User
            ?? throw new HubException("Нужна авторизация");
        await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{user.Id}");
        await base.OnConnectedAsync();
    }

    /* автор может Join на open, чтобы увидеть request_updated */
    public async Task Join(Guid requestId)
    {
        var user = Context.GetHttpContext()?.Items["user"] as User
            ?? throw new HubException("Нужна авторизация");
        var item = await db.HelpRequests.AsNoTracking().FirstOrDefaultAsync(r => r.Id == requestId)
            ?? throw new HubException("Заявка не найдена");
        try
        {
            RequestAccess.EnsureWatchAccess(item, user);
        }
        catch (AppException ex)
        {
            throw new HubException(ex.Message);
        }
        await Groups.AddToGroupAsync(Context.ConnectionId, $"request:{requestId}");
    }
}
