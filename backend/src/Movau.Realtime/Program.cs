using Movau.Api.Hubs;
using Movau.Api.Infrastructure;
using Movau.Realtime;

var settings = Settings.FromEnvironment();
var builder = WebApplication.CreateBuilder(args);
builder.AddMovauPlatform(settings, withSignalR: true);
builder.Services.AddHostedService<RealtimeSubscriber>();

var app = builder.Build();
app.UseMovauPipeline();
app.MapGet("/health", () => Results.Json(new { status = "ok", service = "realtime" }));
app.MapHub<ChatHub>("/hubs/chat");
app.Run();
