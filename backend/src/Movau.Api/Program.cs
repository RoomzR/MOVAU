using Microsoft.EntityFrameworkCore;
using Movau.Api.Data;
using Movau.Api.Endpoints;
using Movau.Api.Hubs;
using Movau.Api.Infrastructure;
using Movau.Api.Services;
using Npgsql;

var settings = Settings.FromEnvironment();
var builder = WebApplication.CreateBuilder(args);
builder.AddMovauPlatform(settings, withSignalR: settings.EmbedRealtime);
if (settings.EmbedRealtime)
{
    builder.Services.AddSingleton<IRealtimeBus, SignalRRealtimeBus>();
}
else
{
    builder.Services.AddSingleton<IRealtimeBus, RedisRealtimeBus>();
}

var app = builder.Build();
app.UseMovauPipeline();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await SchemaBootstrap.EnsureAsync(db);
    var conn = (NpgsqlConnection)db.Database.GetDbConnection();
    if (conn.State != System.Data.ConnectionState.Open)
    {
        await conn.OpenAsync();
    }
    await conn.ReloadTypesAsync();
    await DemoSeed.EnsureAsync(db);
}

app.MapApi();
if (settings.EmbedRealtime)
{
    app.MapHub<ChatHub>("/hubs/chat");
}
app.Run();

public partial class Program;
