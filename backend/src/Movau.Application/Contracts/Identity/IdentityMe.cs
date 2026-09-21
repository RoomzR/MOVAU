namespace Movau.Api.Contracts;

public record IdentityMe(
    string Status,
    string? DocumentKind,
    string? FullName,
    string? PersonalMasked,
    string? DocumentNumber,
    string? RejectReason,
    bool HasDocument,
    bool HasSelfie);
