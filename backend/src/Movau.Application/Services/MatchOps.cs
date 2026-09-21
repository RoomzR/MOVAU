using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class MatchOps
{
    public const int RadiusM = 5000;
    public const int MaxMatches = 8;
    public const int MaxNearbyNotes = 15;

    public static int Meters(double lat1, double lng1, double lat2, double lng2)
    {
        const double earth = 6_371_000;
        var dLat = Rad(lat2 - lat1);
        var dLng = Rad(lng2 - lng1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
            + Math.Cos(Rad(lat1)) * Math.Cos(Rad(lat2)) * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return (int)Math.Round(2 * earth * Math.Asin(Math.Min(1, Math.Sqrt(a))));
    }

    public static HashSet<string> SkillKeys(string? raw) =>
        (raw ?? "")
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Select(part => part.ToLowerInvariant())
            .ToHashSet();

    public static bool HasSkill(string? raw, string category) =>
        SkillKeys(raw).Contains(category.Trim().ToLowerInvariant());

    public static int Score(int meters, bool skillMatch, int karmaPoints)
    {
        var distance = (int)Math.Round(50.0 * Math.Max(0, 1.0 - meters / (double)RadiusM));
        var skill = skillMatch ? 30 : 0;
        var karma = Math.Min(20, Math.Max(0, karmaPoints));
        return distance + skill + karma;
    }

    public static string CategoryLabel(string category) => category switch
    {
        "errand" => "Поручение",
        "pharmacy" => "Аптека",
        "grocery" => "Продукты",
        "ride" => "Довезти",
        "home" => "Дом",
        "animals" => "Животные",
        "kids" => "Дети",
        _ => "Другое",
    };

    public static async Task<List<RequestMatch>> ListAsync(
        AppDbContext db, ShiftStore shifts, HelpRequest item)
    {
        var originLat = item.Location.Y;
        var originLng = item.Location.X;
        var online = await shifts.ListOnlineAsync();
        var ids = online
            .Where(row => row.UserId != item.ClientId
                && row.State.Latitude is not null
                && row.State.Longitude is not null
                && Meters(originLat, originLng, row.State.Latitude.Value, row.State.Longitude.Value) <= RadiusM)
            .Select(row => row.UserId)
            .ToList();
        if (ids.Count == 0)
        {
            return [];
        }
        var people = await db.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id) && u.IsActive)
            .ToDictionaryAsync(u => u.Id);
        var ranked = new List<RequestMatch>();
        foreach (var row in online)
        {
            if (!people.TryGetValue(row.UserId, out var person)
                || row.State.Latitude is null
                || row.State.Longitude is null)
            {
                continue;
            }
            var meters = Meters(originLat, originLng, row.State.Latitude.Value, row.State.Longitude.Value);
            if (meters > RadiusM)
            {
                continue;
            }
            var skill = HasSkill(person.Skills, item.Category);
            var karma = await Mapping.LoadKarma(db, person.Id);
            ranked.Add(new RequestMatch(
                person.Id.ToString(),
                person.DisplayName,
                meters,
                skill,
                karma.KarmaPoints,
                Score(meters, skill, karma.KarmaPoints),
                false,
                "ranked"));
        }
        var ordered = ranked
            .OrderByDescending(row => row.Score)
            .ThenBy(row => row.Meters)
            .Take(MaxMatches)
            .ToList();
        var variant = VariantFor(item.Id);
        if (variant == "random")
        {
            return Shuffle(ordered)
                .Select(row => row with { Recommended = false, Variant = variant })
                .ToList();
        }
        return ordered
            .Select((row, index) => row with { Recommended = index < 3, Variant = variant })
            .ToList();
    }

    public static string VariantFor(Guid requestId) =>
        requestId.ToByteArray()[0] % 2 == 0 ? "ranked" : "random";

    public static async Task RecordImpressionsAsync(
        AppDbContext db, Guid requestId, IReadOnlyList<RequestMatch> rows)
    {
        if (rows.Count == 0)
        {
            return;
        }
        var variant = rows[0].Variant;
        var ids = rows.Select(row => Guid.Parse(row.UserId)).ToList();
        var seen = await db.MatchEvents.AsNoTracking()
            .Where(e => e.HelpRequestId == requestId && e.Variant == variant && e.Kind == "impression" && ids.Contains(e.CandidateId))
            .Select(e => e.CandidateId)
            .ToListAsync();
        var now = DateTimeOffset.UtcNow;
        foreach (var id in ids.Except(seen))
        {
            db.MatchEvents.Add(new MatchEvent
            {
                HelpRequestId = requestId,
                CandidateId = id,
                Variant = variant,
                Kind = "impression",
                CreatedAt = now,
            });
        }
    }

    public static async Task RecordClickAsync(AppDbContext db, Guid requestId, Guid candidateId)
    {
        var variant = VariantFor(requestId);
        var exists = await db.MatchEvents.AnyAsync(e =>
            e.HelpRequestId == requestId
            && e.CandidateId == candidateId
            && e.Variant == variant
            && e.Kind == "click");
        if (exists)
        {
            return;
        }
        db.MatchEvents.Add(new MatchEvent
        {
            HelpRequestId = requestId,
            CandidateId = candidateId,
            Variant = variant,
            Kind = "click",
            CreatedAt = DateTimeOffset.UtcNow,
        });
    }

    private static List<RequestMatch> Shuffle(List<RequestMatch> rows)
    {
        var copy = rows.ToList();
        for (var i = copy.Count - 1; i > 0; i--)
        {
            var j = Random.Shared.Next(i + 1);
            (copy[i], copy[j]) = (copy[j], copy[i]);
        }
        return copy;
    }

    public static async Task<List<InboxNotification>> BuildNearbyAsync(
        AppDbContext db, ShiftStore shifts, HelpRequest item, Guid actorId)
    {
        var originLat = item.Location.Y;
        var originLng = item.Location.X;
        var online = await shifts.ListOnlineAsync();
        var picked = new List<Guid>();
        foreach (var row in online)
        {
            if (row.UserId == actorId
                || row.UserId == item.ClientId
                || row.State.Latitude is null
                || row.State.Longitude is null)
            {
                continue;
            }
            if (Meters(originLat, originLng, row.State.Latitude.Value, row.State.Longitude.Value) > RadiusM)
            {
                continue;
            }
            picked.Add(row.UserId);
            if (picked.Count >= MaxNearbyNotes)
            {
                break;
            }
        }
        if (picked.Count == 0)
        {
            return [];
        }
        var active = await db.Users.AsNoTracking()
            .Where(u => picked.Contains(u.Id) && u.IsActive)
            .Select(u => u.Id)
            .ToListAsync();
        var href = $"/requests/{item.Id}";
        var title = CategoryLabel(item.Category);
        var body = item.Title;
        return active
            .Select(id => NotificationOps.Build(id, NotificationKind.RequestNearby, title, body, href))
            .ToList();
    }

    private static double Rad(double deg) => deg * Math.PI / 180.0;
}
