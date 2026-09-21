namespace Movau.Api.Contracts;

public record IdentitySubmit(
    string DocumentKind,
    string FullName,
    string PersonalNumber,
    string DocumentNumber,
    string Document,
    string Selfie);
