using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum HelpRequestStatus
{
    [PgName("open")] Open,
    [PgName("assigned")] Assigned,
    [PgName("in_progress")] InProgress,
    [PgName("completed")] Completed,
    [PgName("cancelled")] Cancelled,
}
