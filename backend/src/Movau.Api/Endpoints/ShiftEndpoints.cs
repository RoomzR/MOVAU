using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapShift(this WebApplication app)
    {
        var shift = app.MapGroup("/api/v1/shift").RequireUser();
        shift.MapGet("/me", ShiftMe);
        shift.MapGet("/live", ShiftLive);
        shift.MapPost("/on", ShiftOn);
        shift.MapPost("/heartbeat", ShiftBeat);
        shift.MapPost("/off", ShiftOff);
    }

    private static async Task<IResult> ShiftMe(User user, ShiftStore shifts)
    {
        RequireExecutor(user);
        var state = await shifts.GetAsync(user.Id);
        return Results.Json(new ShiftPublic(state.OnShift, state.Latitude, state.Longitude, state.UpdatedAt));
    }

    private static async Task<IResult> ShiftOn(
        ShiftLocation body,
        User user,
        AppDbContext db,
        ShiftStore shifts,
        TrackStore tracks,
        IRealtimeBus bus,
        IHttpClientFactory http,
        Settings settings)
    {
        RequireExecutor(user);
        var state = await shifts.SetAsync(user.Id, body.Latitude, body.Longitude);
        await TrackOps.MirrorShiftAsync(db, tracks, bus, http, settings, user.Id, body.Latitude, body.Longitude);
        return Results.Json(new ShiftPublic(state.OnShift, state.Latitude, state.Longitude, state.UpdatedAt));
    }

    private static async Task<IResult> ShiftBeat(
        ShiftLocation body,
        User user,
        AppDbContext db,
        ShiftStore shifts,
        TrackStore tracks,
        IRealtimeBus bus,
        IHttpClientFactory http,
        Settings settings)
    {
        RequireExecutor(user);
        var current = await shifts.GetAsync(user.Id);
        if (!current.OnShift)
        {
            throw new AppException(409, "Смена выключена");
        }
        var state = await shifts.SetAsync(user.Id, body.Latitude, body.Longitude);
        await TrackOps.MirrorShiftAsync(db, tracks, bus, http, settings, user.Id, body.Latitude, body.Longitude);
        return Results.Json(new ShiftPublic(state.OnShift, state.Latitude, state.Longitude, state.UpdatedAt));
    }

    private static async Task<IResult> ShiftOff(User user, ShiftStore shifts)
    {
        RequireExecutor(user);
        var state = await shifts.ClearAsync(user.Id);
        return Results.Json(new ShiftPublic(state.OnShift, state.Latitude, state.Longitude, state.UpdatedAt));
    }

    private static async Task<IResult> ShiftLive(AppDbContext db, ShiftStore shifts)
    {
        var online = await shifts.ListOnlineAsync();
        var ids = online.Select(x => x.UserId).ToList();
        var names = await db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id) && u.IsActive)
            .ToDictionaryAsync(u => u.Id, u => u.DisplayName);
        var people = online
            .Where(x => names.ContainsKey(x.UserId) && x.State.Latitude is not null && x.State.Longitude is not null)
            .Select(x => new ShiftLivePerson(
                x.UserId.ToString(),
                names[x.UserId],
                x.State.Latitude!.Value,
                x.State.Longitude!.Value,
                x.State.UpdatedAt ?? ""))
            .ToList();
        return Results.Json(people);
    }
}

