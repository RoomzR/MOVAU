using Movau.Api.Contracts;
using Movau.Api.Domain;

namespace Movau.Api.Services;

public static partial class Mapping
{
    public static WalletHoldPublic ToPublic(WalletHold item) => new(
        item.Id,
        item.HelpRequestId,
        item.PayerId,
        item.PayeeId,
        item.Amount,
        HoldName(item.Status),
        item.CreatedAt.ToString("O"));

    public static WalletTxnPublic ToPublic(WalletTxn item) => new(
        item.Id,
        item.Amount,
        TxnKindName(item.Kind),
        item.HelpRequestId,
        item.CreatedAt.ToString("O"));
}
