namespace Movau.Api.Contracts;

public record WalletTxnPublic(Guid Id, decimal Amount, string Kind, Guid? HelpRequestId, string CreatedAt);
