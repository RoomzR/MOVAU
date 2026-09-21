using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum WalletHoldStatus
{
    [PgName("held")] Held,
    [PgName("released")] Released,
    [PgName("refunded")] Refunded,
}
