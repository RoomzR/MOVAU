using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum AdminEventKind
{
    [PgName("request_cancelled")] RequestCancelled,
    [PgName("user_deactivated")] UserDeactivated,
    [PgName("user_activated")] UserActivated,
    [PgName("dispute_resolved")] DisputeResolved,
    [PgName("identity_reviewed")] IdentityReviewed,
    [PgName("user_role_granted")] UserRoleGranted,
    [PgName("user_role_revoked")] UserRoleRevoked,
}
