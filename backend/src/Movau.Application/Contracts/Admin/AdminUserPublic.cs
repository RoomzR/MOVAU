namespace Movau.Api.Contracts;

public record AdminUserPublic(
    string Id,
    string Email,
    string DisplayName,
    bool IsActive,
    List<string> Roles,
    string CreatedAt);
