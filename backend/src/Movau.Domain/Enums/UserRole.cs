using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum UserRole
{
    [PgName("client")] Client,
    [PgName("executor")] Executor,
    [PgName("volunteer")] Volunteer,
    [PgName("business")] Business,
    [PgName("moderator")] Moderator,
    [PgName("analyst")] Analyst,
    [PgName("admin")] Admin,
}
