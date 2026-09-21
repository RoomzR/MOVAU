using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class OfferConfiguration : IEntityTypeConfiguration<Offer>
{
    public void Configure(EntityTypeBuilder<Offer> e)
    {
        e.ToTable("offers");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.HelpRequestId).HasColumnName("help_request_id");
        e.Property(x => x.ExecutorId).HasColumnName("executor_id");
        e.Property(x => x.Message).HasColumnName("message").HasMaxLength(280);
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => new { x.HelpRequestId, x.ExecutorId }).IsUnique();
        e.HasOne(x => x.HelpRequest).WithMany(x => x.Offers).HasForeignKey(x => x.HelpRequestId);
        e.HasOne(x => x.Executor).WithMany().HasForeignKey(x => x.ExecutorId);
    }
}
