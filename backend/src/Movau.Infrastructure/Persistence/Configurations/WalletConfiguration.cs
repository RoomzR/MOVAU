using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class WalletConfiguration : IEntityTypeConfiguration<Wallet>
{
    public void Configure(EntityTypeBuilder<Wallet> e)
    {
        e.ToTable("wallets");
        e.HasKey(x => x.UserId);
        e.Property(x => x.UserId).HasColumnName("user_id");
        e.Property(x => x.Balance).HasColumnName("balance").HasPrecision(12, 2);
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasOne(x => x.User).WithOne().HasForeignKey<Wallet>(x => x.UserId).IsRequired();
        e.Navigation(x => x.User).AutoInclude(false);
    }
}
