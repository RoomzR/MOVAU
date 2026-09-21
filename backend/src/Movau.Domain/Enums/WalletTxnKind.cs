using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum WalletTxnKind
{
    [PgName("topup")] Topup,
    [PgName("hold")] Hold,
    [PgName("release")] Release,
    [PgName("refund")] Refund,
}
