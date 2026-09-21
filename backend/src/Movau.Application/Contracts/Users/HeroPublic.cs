namespace Movau.Api.Contracts;

public record HeroPublic(
    string Id,
    string DisplayName,
    string? Bio,
    int KarmaPoints,
    double? RatingAvg,
    int RatingCount);
