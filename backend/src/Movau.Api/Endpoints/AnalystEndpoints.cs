using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapAnalyst(this WebApplication app)
    {
        app.MapGet("/api/v1/analyst/overview", AnalystOverview).RequireAnalyst();
    }

    private static int AnalystDays(int days) => days switch
    {
        30 => 30,
        90 => 90,
        _ => 7,
    };

    private static async Task<IResult> AnalystOverview(AppDbContext db, ShiftStore shifts, int days = 7)
    {
        days = AnalystDays(days);
        var end = DateTimeOffset.UtcNow;
        var start = new DateTimeOffset(end.UtcDateTime.Date.AddDays(-(days - 1)), TimeSpan.Zero);
        var online = await shifts.ListOnlineAsync();

        var createdRows = await db.HelpRequests.AsNoTracking()
            .Where(r => r.CreatedAt >= start && r.CreatedAt < end)
            .Select(r => new { r.Id, r.Title, r.Category, r.Price, r.CreatedAt, r.UpdatedAt, r.Status, r.ExecutorId, r.Location })
            .ToListAsync();
        var closedRows = await db.HelpRequests.AsNoTracking()
            .Where(r =>
                (r.Status == HelpRequestStatus.Completed || r.Status == HelpRequestStatus.Cancelled)
                && r.UpdatedAt >= start && r.UpdatedAt < end)
            .Select(r => new { r.Status, r.UpdatedAt })
            .ToListAsync();
        var disputesOpened = await db.Disputes.CountAsync(d => d.CreatedAt >= start && d.CreatedAt < end);
        var spent = await db.WalletHolds
            .Where(h => h.Status == WalletHoldStatus.Released && h.UpdatedAt >= start && h.UpdatedAt < end)
            .SumAsync(h => (decimal?)h.Amount) ?? 0;

        var createdByDay = createdRows
            .GroupBy(r => r.CreatedAt.UtcDateTime.Date)
            .ToDictionary(g => g.Key, g => g.Count());
        var completedByDay = closedRows
            .Where(r => r.Status == HelpRequestStatus.Completed)
            .GroupBy(r => r.UpdatedAt.UtcDateTime.Date)
            .ToDictionary(g => g.Key, g => g.Count());
        var series = new List<AnalystDay>(days);
        for (var i = 0; i < days; i++)
        {
            var day = start.UtcDateTime.Date.AddDays(i);
            series.Add(new AnalystDay(
                day.ToString("yyyy-MM-dd"),
                createdByDay.GetValueOrDefault(day),
                completedByDay.GetValueOrDefault(day)));
        }

        var counts = createdRows
            .GroupBy(r => RequestCategories.Contains(r.Category) ? r.Category : "other")
            .ToDictionary(g => g.Key, g => g.Count());
        var categories = RequestCategories
            .Select(id => new AnalystCategory(id, counts.GetValueOrDefault(id)))
            .OrderByDescending(row => row.Count)
            .ThenBy(row => row.Category)
            .ToList();
        const double step = 0.02;
        var cells = createdRows
            .GroupBy(r => (
                Lat: Math.Round(r.Location.Y / step) * step,
                Lng: Math.Round(r.Location.X / step) * step))
            .Select(g => new AnalystCell(g.Key.Lat, g.Key.Lng, g.Count()))
            .OrderByDescending(row => row.Count)
            .ThenBy(row => row.Lat)
            .ThenBy(row => row.Lng)
            .Take(80)
            .ToList();
        var points = createdRows
            .OrderByDescending(r => r.CreatedAt)
            .Take(120)
            .Select(r => new AnalystPoint(r.Id.ToString(), r.Title, r.Category, r.Location.Y, r.Location.X, r.Price))
            .ToList();
        var taken = createdRows.Count(r =>
            r.ExecutorId is not null
            || (r.Status != HelpRequestStatus.Open && r.Status != HelpRequestStatus.Cancelled));
        var funnelDone = createdRows.Count(r => r.Status == HelpRequestStatus.Completed);
        var funnelCancel = createdRows.Count(r => r.Status == HelpRequestStatus.Cancelled);
        var createdCount = createdRows.Count;
        var completePct = createdCount == 0 ? 0 : (int)Math.Round(100.0 * funnelDone / createdCount);
        var cancelPct = createdCount == 0 ? 0 : (int)Math.Round(100.0 * funnelCancel / createdCount);
        var completeHours = createdRows
            .Where(r => r.Status == HelpRequestStatus.Completed)
            .Select(r => Math.Max(0, (r.UpdatedAt - r.CreatedAt).TotalHours))
            .OrderBy(h => h)
            .ToList();
        double? medianHours = null;
        if (completeHours.Count > 0)
        {
            var mid = completeHours.Count / 2;
            medianHours = completeHours.Count % 2 == 1
                ? Math.Round(completeHours[mid], 1)
                : Math.Round((completeHours[mid - 1] + completeHours[mid]) / 2.0, 1);
        }

        var matchRows = await db.MatchEvents.AsNoTracking()
            .Where(e => e.CreatedAt >= start && e.CreatedAt < end)
            .Select(e => new { e.Variant, e.Kind })
            .ToListAsync();
        static int CtrPct(int clicks, int impressions) =>
            impressions == 0 ? 0 : (int)Math.Round(100.0 * clicks / impressions);
        var rankedImpressions = matchRows.Count(e => e.Variant == "ranked" && e.Kind == "impression");
        var rankedClicks = matchRows.Count(e => e.Variant == "ranked" && e.Kind == "click");
        var randomImpressions = matchRows.Count(e => e.Variant == "random" && e.Kind == "impression");
        var randomClicks = matchRows.Count(e => e.Variant == "random" && e.Kind == "click");

        return Results.Json(new AnalystOverview(
            days,
            await db.Users.CountAsync(u => u.IsActive),
            await db.HelpRequests.CountAsync(r => r.Status == HelpRequestStatus.Open),
            online.Count,
            await db.Disputes.CountAsync(d => d.Status == DisputeStatus.Open),
            await db.WalletHolds.Where(h => h.Status == WalletHoldStatus.Held).SumAsync(h => (decimal?)h.Amount) ?? 0,
            createdRows.Count,
            closedRows.Count(r => r.Status == HelpRequestStatus.Completed),
            closedRows.Count(r => r.Status == HelpRequestStatus.Cancelled),
            disputesOpened,
            spent,
            series,
            categories,
            cells,
            points,
            new AnalystFunnel(createdCount, taken, funnelDone, funnelCancel),
            completePct,
            cancelPct,
            medianHours,
            new AnalystMatchCtr(
                rankedImpressions,
                rankedClicks,
                CtrPct(rankedClicks, rankedImpressions),
                randomImpressions,
                randomClicks,
                CtrPct(randomClicks, randomImpressions))));
    }
}

