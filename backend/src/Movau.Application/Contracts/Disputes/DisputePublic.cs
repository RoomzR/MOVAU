namespace Movau.Api.Contracts;

public record DisputePublic(
    Guid Id,
    Guid HelpRequestId,
    Guid AuthorId,
    string AuthorDisplayName,
    string Reason,
    string Status,
    string? Resolution,
    string CreatedAt);
