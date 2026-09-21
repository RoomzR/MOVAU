namespace Movau.Api.Contracts;

public record ReviewPublic(
    Guid Id,
    Guid HelpRequestId,
    Guid AuthorId,
    string AuthorDisplayName,
    Guid SubjectId,
    int Score,
    string? Comment,
    string CreatedAt);
