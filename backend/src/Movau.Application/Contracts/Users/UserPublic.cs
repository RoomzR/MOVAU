namespace Movau.Api.Contracts;

public record UserPublic(
    string Id,
    string Email,
    string DisplayName,
    string? Phone,
    string? Bio,
    string? Skills,
    bool IsActive,
    List<string> Roles,
    int KarmaPoints,
    double? RatingAvg,
    int RatingCount,
    string ClientLevel,
    int CompletedAsClient,
    string IdentityStatus,
    bool PhoneVerified);
