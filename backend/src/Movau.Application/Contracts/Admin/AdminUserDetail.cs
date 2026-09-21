namespace Movau.Api.Contracts;

public record AdminUserDetail(
    string Id,
    string Email,
    string DisplayName,
    string? Phone,
    bool PhoneVerified,
    bool IsActive,
    List<string> Roles,
    string CreatedAt,
    string IdentityStatus,
    int RequestsTotal,
    int RequestsOpen,
    int RequestsCompleted,
    List<AdminUserRef> Requests);
