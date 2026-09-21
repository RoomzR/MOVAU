using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class DisputeConfiguration : IEntityTypeConfiguration<Dispute>
{
    public void Configure(EntityTypeBuilder<Dispute> e)
    {
        e.ToTable("disputes");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.HelpRequestId).HasColumnName("help_request_id");
        e.Property(x => x.AuthorId).HasColumnName("author_id");
        e.Property(x => x.Reason).HasColumnName("reason").HasMaxLength(500);
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.Resolution).HasColumnName("resolution").HasMaxLength(500);
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasOne(x => x.HelpRequest).WithMany().HasForeignKey(x => x.HelpRequestId);
        e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorId);
    }
}
