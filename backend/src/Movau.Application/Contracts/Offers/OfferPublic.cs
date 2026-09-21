namespace Movau.Api.Contracts;

public record OfferPublic(
    Guid Id,
    Guid HelpRequestId,
    Guid ExecutorId,
    string ExecutorDisplayName,
    string? Message,
    string Status,
    string CreatedAt);
