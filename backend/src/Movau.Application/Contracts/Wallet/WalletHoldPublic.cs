namespace Movau.Api.Contracts;

public record WalletHoldPublic(
    Guid Id,
    Guid HelpRequestId,
    Guid PayerId,
    Guid? PayeeId,
    decimal Amount,
    string Status,
    string CreatedAt);
