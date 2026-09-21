using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class TrackOps
{
    public static void EnsureCoords(double lat, double lng)
    {
        if (lat is < -90 or > 90 || lng is < -180 or > 180)
        {
            throw new AppException(400, "Некорректные координаты");
        }
    }

    public static async Task<TrackPublic> PingAsync(
        TrackStore tracks,
        IRealtimeBus bus,
        HelpRequest item,
        double lat,
        double lng)
    {
        EnsureCoords(lat, lng);
        var state = await tracks.SetAsync(item.Id, lat, lng);
        var dto = new TrackPublic(item.Id, state.Latitude, state.Longitude, state.UpdatedAt, item.EtaAt?.ToString("O"));
        await bus.ToGroupAsync($"request:{item.Id}", "location", dto);
        await bus.ToGroupAsync($"user:{item.ClientId}", "location", dto);
        return dto;
    }

    public static async Task MirrorShiftAsync(
        AppDbContext db,
        TrackStore tracks,
        IRealtimeBus bus,
        IHttpClientFactory http,
        Settings settings,
        Guid executorId,
        double lat,
        double lng)
    {
        var item = await db.HelpRequests
            .Where(r => r.ExecutorId == executorId
                && (r.Status == HelpRequestStatus.Assigned || r.Status == HelpRequestStatus.InProgress))
            .OrderByDescending(r => r.UpdatedAt)
            .FirstOrDefaultAsync();
        if (item is null)
        {
            return;
        }
        var minutes = await EtaOps.MinutesAsync(http, settings, lat, lng, item.Location.Y, item.Location.X);
        item.EtaAt = DateTimeOffset.UtcNow.AddMinutes(minutes);
        item.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync();
        await PingAsync(tracks, bus, item, lat, lng);
    }
}
