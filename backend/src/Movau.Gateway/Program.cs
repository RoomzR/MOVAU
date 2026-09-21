using Movau.Gateway;

var builder = WebApplication.CreateBuilder(args);
var core = Environment.GetEnvironmentVariable("CORE_URL") ?? "http://localhost:8001";
var realtime = Environment.GetEnvironmentVariable("REALTIME_URL") ?? "http://localhost:8002";

builder.Services.AddReverseProxy()
    .LoadFromMemory(GatewayRouting.Routes, GatewayRouting.Clusters(core, realtime));

var app = builder.Build();
app.UseWebSockets();
app.MapGet("/health", () => Results.Json(new { status = "ok", service = "gateway" }));
app.MapReverseProxy();
app.Run();
