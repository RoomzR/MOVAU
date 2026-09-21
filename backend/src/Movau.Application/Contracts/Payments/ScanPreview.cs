namespace Movau.Api.Contracts;

public record ScanPreview(
    Guid HelpRequestId,
    string Title,
    decimal? Amount,
    string Currency,
    string RequestStatus,
    string PaymentStatus,
    Guid? ExecutorId,
    bool Claimable,
    bool NeedsPhoto);
