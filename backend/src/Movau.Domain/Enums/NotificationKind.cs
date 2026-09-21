using NpgsqlTypes;

namespace Movau.Api.Domain;

public enum NotificationKind
{
    [PgName("request_taken")] RequestTaken,
    [PgName("message")] Message,
    [PgName("identity_reviewed")] IdentityReviewed,
    [PgName("offer")] Offer,
    [PgName("request_started")] RequestStarted,
    [PgName("request_completed")] RequestCompleted,
    [PgName("payment_released")] PaymentReleased,
    [PgName("dispute_opened")] DisputeOpened,
    [PgName("dispute_resolved")] DisputeResolved,
    [PgName("request_nearby")] RequestNearby,
}
