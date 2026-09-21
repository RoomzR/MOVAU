using Movau.Api.Domain;
using NetTopologySuite.Geometries;

namespace Movau.Api.Services;

public static partial class Mapping
{
    public static string RoleName(UserRole role) => role switch
    {
        UserRole.Client => "client",
        UserRole.Executor => "executor",
        UserRole.Volunteer => "volunteer",
        UserRole.Business => "business",
        UserRole.Moderator => "moderator",
        UserRole.Analyst => "analyst",
        UserRole.Admin => "admin",
        _ => role.ToString().ToLowerInvariant(),
    };

    public static string StatusName(HelpRequestStatus status) => status switch
    {
        HelpRequestStatus.Open => "open",
        HelpRequestStatus.Assigned => "assigned",
        HelpRequestStatus.InProgress => "in_progress",
        HelpRequestStatus.Completed => "completed",
        HelpRequestStatus.Cancelled => "cancelled",
        _ => status.ToString().ToLowerInvariant(),
    };

    public static string OfferName(OfferStatus status) => status switch
    {
        OfferStatus.Pending => "pending",
        OfferStatus.Accepted => "accepted",
        OfferStatus.Rejected => "rejected",
        OfferStatus.Withdrawn => "withdrawn",
        _ => status.ToString().ToLowerInvariant(),
    };

    public static UserRole ParseRole(string value) => value switch
    {
        "client" => UserRole.Client,
        "executor" => UserRole.Executor,
        "volunteer" => UserRole.Volunteer,
        "business" => UserRole.Business,
        "moderator" => UserRole.Moderator,
        "analyst" => UserRole.Analyst,
        "admin" => UserRole.Admin,
        _ => throw new ArgumentException(value),
    };

    public static string DisputeName(DisputeStatus status) => status switch
    {
        DisputeStatus.Open => "open",
        DisputeStatus.Resolved => "resolved",
        _ => status.ToString().ToLowerInvariant(),
    };

    public static string HoldName(WalletHoldStatus status) => status switch
    {
        WalletHoldStatus.Held => "held",
        WalletHoldStatus.Released => "released",
        WalletHoldStatus.Refunded => "refunded",
        _ => status.ToString().ToLowerInvariant(),
    };

    public static string TxnKindName(WalletTxnKind kind) => kind switch
    {
        WalletTxnKind.Topup => "topup",
        WalletTxnKind.Hold => "hold",
        WalletTxnKind.Release => "release",
        WalletTxnKind.Refund => "refund",
        _ => kind.ToString().ToLowerInvariant(),
    };

    public static Point Point(double lat, double lng) => new(lng, lat) { SRID = 4326 };

    public static bool HasRole(User user, UserRole role) => user.Roles.Any(r => r.Role == role);
}

public record KarmaStats(int KarmaPoints, double? RatingAvg, int RatingCount);

public record ClientStats(string Level, int CompletedAsClient);
