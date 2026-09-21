using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class IdentityVerificationConfiguration : IEntityTypeConfiguration<IdentityVerification>
{
    public void Configure(EntityTypeBuilder<IdentityVerification> e)
    {
        e.ToTable("identity_verifications");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.UserId).HasColumnName("user_id");
        e.Property(x => x.DocumentKind).HasColumnName("document_kind");
        e.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(80);
        e.Property(x => x.PersonalNumber).HasColumnName("personal_number").HasMaxLength(32);
        e.Property(x => x.PersonalHash).HasColumnName("personal_hash").HasMaxLength(64);
        e.Property(x => x.DocumentNumber).HasColumnName("document_number").HasMaxLength(32);
        e.Property(x => x.DocumentBytes).HasColumnName("document_bytes");
        e.Property(x => x.SelfieBytes).HasColumnName("selfie_bytes");
        e.Property(x => x.Status).HasColumnName("status");
        e.Property(x => x.RejectReason).HasColumnName("reject_reason").HasMaxLength(500);
        e.Property(x => x.ReviewedBy).HasColumnName("reviewed_by");
        e.Property(x => x.ReviewedAt).HasColumnName("reviewed_at");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => x.UserId).IsUnique();
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
