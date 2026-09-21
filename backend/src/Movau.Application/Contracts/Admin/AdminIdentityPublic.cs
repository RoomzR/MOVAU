namespace Movau.Api.Contracts;

public record AdminIdentityPublic(
    Guid Id,
    Guid UserId,
    string Email,
    string DisplayName,
    string DocumentKind,
    string FullName,
    string PersonalNumber,
    string DocumentNumber,
    string Status,
    string? RejectReason,
    string CreatedAt,
    bool HasDocument,
    bool HasSelfie,
    string? ReviewedAt = null);
