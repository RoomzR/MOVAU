using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class MatchEventConfiguration : IEntityTypeConfiguration<MatchEvent>
{
    public void Configure(EntityTypeBuilder<MatchEvent> e)
    {
        e.ToTable("match_events");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.HelpRequestId).HasColumnName("help_request_id");
        e.Property(x => x.CandidateId).HasColumnName("candidate_id");
        e.Property(x => x.Variant).HasColumnName("variant").HasMaxLength(16);
        e.Property(x => x.Kind).HasColumnName("kind").HasMaxLength(16);
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.HasIndex(x => new { x.HelpRequestId, x.CandidateId, x.Variant, x.Kind }).IsUnique();
        e.HasOne(x => x.HelpRequest).WithMany().HasForeignKey(x => x.HelpRequestId).OnDelete(DeleteBehavior.Cascade);
        e.HasOne(x => x.Candidate).WithMany().HasForeignKey(x => x.CandidateId).OnDelete(DeleteBehavior.Cascade);
    }
}
