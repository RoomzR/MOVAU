using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class HelpRequestConfiguration : IEntityTypeConfiguration<HelpRequest>
{
    public void Configure(EntityTypeBuilder<HelpRequest> e)
    {
        e.ToTable("help_requests");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.ClientId).HasColumnName("client_id");
        e.Property(x => x.ExecutorId).HasColumnName("executor_id");
        e.Property(x => x.Title).HasColumnName("title").HasMaxLength(140);
        e.Property(x => x.Description).HasColumnName("description");
        e.Property(x => x.Category).HasColumnName("category").HasMaxLength(64);
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.Location).HasColumnName("location").HasColumnType("geography (Point,4326)");
        e.Property(x => x.AddressText).HasColumnName("address_text").HasMaxLength(255);
        e.Property(x => x.Price).HasColumnName("price").HasPrecision(10, 2);
        e.Property(x => x.PaymentCode).HasColumnName("payment_code").HasMaxLength(32);
        e.Property(x => x.EtaAt).HasColumnName("eta_at");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => x.PaymentCode).IsUnique();
        e.HasOne(x => x.Client).WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(x => x.Executor).WithMany().HasForeignKey(x => x.ExecutorId).OnDelete(DeleteBehavior.SetNull);
    }
}
