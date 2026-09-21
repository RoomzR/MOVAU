using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class WalletTxnConfiguration : IEntityTypeConfiguration<WalletTxn>
{
    public void Configure(EntityTypeBuilder<WalletTxn> e)
    {
        e.ToTable("wallet_txns");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.WalletUserId).HasColumnName("wallet_user_id");
        e.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
        e.Property(x => x.Kind).HasColumnName("kind");
        e.Property(x => x.HelpRequestId).HasColumnName("help_request_id");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.HasIndex(x => new { x.WalletUserId, x.CreatedAt });
    }
}
