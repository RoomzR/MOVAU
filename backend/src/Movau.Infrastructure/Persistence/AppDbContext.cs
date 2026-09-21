using Microsoft.EntityFrameworkCore;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRoleAssignment> UserRoles => Set<UserRoleAssignment>();
    public DbSet<HelpRequest> HelpRequests => Set<HelpRequest>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<ChatMessage> Messages => Set<ChatMessage>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Wallet> Wallets => Set<Wallet>();
    public DbSet<WalletHold> WalletHolds => Set<WalletHold>();
    public DbSet<WalletTxn> WalletTxns => Set<WalletTxn>();
    public DbSet<Dispute> Disputes => Set<Dispute>();
    public DbSet<IdentityVerification> IdentityVerifications => Set<IdentityVerification>();
    public DbSet<InboxNotification> Notifications => Set<InboxNotification>();
    public DbSet<AdminEvent> AdminEvents => Set<AdminEvent>();
    public DbSet<MatchEvent> MatchEvents => Set<MatchEvent>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.HasPostgresExtension("postgis");
        model.HasPostgresEnum<UserRole>("user_role");
        model.HasPostgresEnum<HelpRequestStatus>("help_request_status");
        model.HasPostgresEnum<OfferStatus>("offer_status");
        model.HasPostgresEnum<WalletHoldStatus>("wallet_hold_status");
        model.HasPostgresEnum<WalletTxnKind>("wallet_txn_kind");
        model.HasPostgresEnum<DisputeStatus>("dispute_status");
        model.HasPostgresEnum<IdentityStatus>("identity_status");
        model.HasPostgresEnum<IdentityDocumentKind>("identity_document_kind");
        model.HasPostgresEnum<NotificationKind>("notification_kind");
        model.HasPostgresEnum<AdminEventKind>("admin_event_kind");
        model.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
