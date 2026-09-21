using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;

namespace Movau.Api.Services;

public static partial class Mapping
{
    public static UserPublic ToPublic(User user, KarmaStats karma, ClientStats client, string identityStatus) => new(
        user.Id.ToString(),
        user.Email,
        user.DisplayName,
        user.Phone,
        user.Bio,
        user.Skills,
        user.IsActive,
        user.Roles.Select(r => RoleName(r.Role)).ToList(),
        karma.KarmaPoints,
        karma.RatingAvg,
        karma.RatingCount,
        client.Level,
        client.CompletedAsClient,
        identityStatus,
        user.PhoneVerifiedAt is not null && user.Phone is not null);

    public static UserCard ToCard(User user, KarmaStats karma, ClientStats client, string identityStatus) => new(
        user.Id.ToString(),
        user.DisplayName,
        user.Bio,
        user.Skills,
        user.Roles.Select(r => RoleName(r.Role)).ToList(),
        user.CreatedAt.ToString("O"),
        karma.KarmaPoints,
        karma.RatingAvg,
        karma.RatingCount,
        client.Level,
        client.CompletedAsClient,
        identityStatus);

    /* карма считается при чтении профиля, колонок на users нет */
    public static async Task<KarmaStats> LoadKarma(AppDbContext db, Guid userId)
    {
        var row = await db.Reviews.AsNoTracking()
            .Where(r => r.SubjectId == userId)
            .GroupBy(_ => true)
            .Select(g => new { Count = g.Count(), Sum = g.Sum(x => x.Score), Avg = g.Average(x => (double)x.Score) })
            .FirstOrDefaultAsync();
        if (row is null || row.Count == 0)
        {
            return new KarmaStats(0, null, 0);
        }
        return new KarmaStats(row.Sum, Math.Round(row.Avg, 1), row.Count);
    }

    public static async Task<ClientStats> LoadClientStats(AppDbContext db, Guid userId)
    {
        var completed = await db.HelpRequests.AsNoTracking()
            .CountAsync(r => r.ClientId == userId && r.Status == HelpRequestStatus.Completed);
        var level = completed >= 20 ? "vip" : completed >= 5 ? "regular" : "novice";
        return new ClientStats(level, completed);
    }

    public static async Task<UserPublic> ToPublicAsync(User user, AppDbContext db) =>
        ToPublic(user, await LoadKarma(db, user.Id), await LoadClientStats(db, user.Id), await IdentityOps.OwnStatusAsync(db, user.Id));

    public static async Task<UserCard> ToCardAsync(User user, AppDbContext db) =>
        ToCard(user, await LoadKarma(db, user.Id), await LoadClientStats(db, user.Id), await IdentityOps.PublicStatusAsync(db, user.Id));

    public static HeroPublic ToHero(User user, KarmaStats karma) => new(
        user.Id.ToString(),
        user.DisplayName,
        user.Bio,
        karma.KarmaPoints,
        karma.RatingAvg,
        karma.RatingCount);
}
