using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum DisputeStatus
{
    [PgName("open")] Open,
    [PgName("resolved")] Resolved,
}
