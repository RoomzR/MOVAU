using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum OfferStatus
{
    [PgName("pending")] Pending,
    [PgName("accepted")] Accepted,
    [PgName("rejected")] Rejected,
    [PgName("withdrawn")] Withdrawn,
}
