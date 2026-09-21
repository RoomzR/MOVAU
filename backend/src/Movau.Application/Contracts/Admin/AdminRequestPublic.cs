namespace Movau.Api.Contracts;

public record AdminRequestPublic(
    Guid Id,
    Guid ClientId,
    string ClientEmail,
    string ClientDisplayName,
    string Title,
    string Category,
    string Status,
    decimal? Price,
    string CreatedAt,
    string? HoldStatus);
