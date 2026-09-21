namespace Movau.Api.Contracts;

public record PaymentPublic(
    Guid HelpRequestId,
    string Title,
    decimal? Amount,
    string Currency,
    string Purpose,
    string Status,
    string? QrPayload,
    string? Code,
    string RequestStatus);
