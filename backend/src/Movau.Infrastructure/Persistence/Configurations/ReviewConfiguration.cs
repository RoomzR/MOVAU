using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> e)
    {
        e.ToTable("reviews");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.HelpRequestId).HasColumnName("help_request_id");
        e.Property(x => x.AuthorId).HasColumnName("author_id");
        e.Property(x => x.SubjectId).HasColumnName("subject_id");
        e.Property(x => x.Score).HasColumnName("score");
        e.Property(x => x.Comment).HasColumnName("comment").HasMaxLength(500);
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.HasIndex(x => new { x.HelpRequestId, x.AuthorId }).IsUnique();
        e.HasIndex(x => x.SubjectId);
        e.HasOne(x => x.HelpRequest).WithMany(x => x.Reviews).HasForeignKey(x => x.HelpRequestId);
        e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorId);
        e.HasOne(x => x.Subject).WithMany().HasForeignKey(x => x.SubjectId);
    }
}
