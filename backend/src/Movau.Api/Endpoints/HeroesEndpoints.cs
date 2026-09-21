using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapHeroes(this WebApplication app)
    {
        app.MapGet("/api/v1/heroes", ListHeroes);
    }

    private static async Task<IResult> ListHeroes(AppDbContext db)
    {
        var volunteers = await db.Users.AsNoTracking().Include(u => u.Roles)
            .Where(u => u.IsActive && u.Roles.Any(r => r.Role == UserRole.Volunteer))
            .ToListAsync();
        var cards = new List<HeroPublic>();
        foreach (var person in volunteers)
        {
            cards.Add(Mapping.ToHero(person, await Mapping.LoadKarma(db, person.Id)));
        }
        return Results.Json(cards.OrderByDescending(h => h.KarmaPoints).ThenBy(h => h.DisplayName).Take(20).ToList());
    }
}

