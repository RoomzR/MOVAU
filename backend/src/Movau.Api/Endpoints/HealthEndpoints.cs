using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapHealth(this WebApplication app)
    {
        app.MapGet("/health", () => Results.Json(new { status = "ok" }));
        app.MapGet("/health/ready", Ready);
    }

    private static async Task<IResult> Ready(AppDbContext db, IConnectionReady ready)
    {
        try
        {
            await db.Database.ExecuteSqlRawAsync("SELECT 1");
        }
        catch (Exception ex)
        {
            throw new AppException(503, $"database: {ex.Message}");
        }
        if (!await ready.PingAsync())
        {
            throw new AppException(503, "redis: unavailable");
        }
        return Results.Json(new { status = "ok", database = "ok", redis = "ok" });
    }
}

