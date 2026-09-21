using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum IdentityStatus
{
    [PgName("pending")] Pending,
    [PgName("verified")] Verified,
    [PgName("rejected")] Rejected,
}
