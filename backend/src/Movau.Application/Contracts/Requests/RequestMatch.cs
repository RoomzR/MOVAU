namespace Movau.Api.Contracts;

public record RequestMatch(
    string UserId,
    string DisplayName,
    int Meters,
    bool SkillMatch,
    int KarmaPoints,
    int Score,
    bool Recommended = false,
    string Variant = "ranked");
