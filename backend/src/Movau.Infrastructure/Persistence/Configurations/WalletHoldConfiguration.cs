using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class WalletHoldConfiguration : IEntityTypeConfiguration<WalletHold>
{
    public void Configure(EntityTypeBuilder<WalletHold> e)
    {
        e.ToTable("wallet_holds");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.HelpRequestId).HasColumnName("help_request_id");
        e.Property(x => x.PayerId).HasColumnName("payer_id");
        e.Property(x => x.PayeeId).HasColumnName("payee_id");
        e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => x.HelpRequestId).IsUnique();
        e.HasOne(x => x.HelpRequest).WithMany().HasForeignKey(x => x.HelpRequestId);
    }
}
