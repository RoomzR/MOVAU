namespace Movau.Api.Contracts;

public record WalletMe(
    decimal Balance,
    string UpdatedAt,
    List<WalletHoldPublic> Holds,
    List<WalletTxnPublic> Txns);
