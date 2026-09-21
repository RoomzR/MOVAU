namespace Movau.Api.Contracts;

public record MessagePublic(
    Guid Id,
    Guid AuthorId,
    string AuthorDisplayName,
    string Body,
    string CreatedAt,
    bool HasImage);
