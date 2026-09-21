namespace Movau.Api.Contracts;

public record NotificationPublic(
    Guid Id,
    string Kind,
    string Title,
    string Body,
    string Href,
    string? ReadAt,
    string CreatedAt);
