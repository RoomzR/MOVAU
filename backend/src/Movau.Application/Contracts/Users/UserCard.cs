namespace Movau.Api.Contracts;

public record UserCard(
    string Id,
    string DisplayName,
    string? Bio,
    string? Skills,
    List<string> Roles,
    string CreatedAt,
    int KarmaPoints,
    double? RatingAvg,
    int RatingCount,
    string ClientLevel,
    int CompletedAsClient,
    string IdentityStatus);
