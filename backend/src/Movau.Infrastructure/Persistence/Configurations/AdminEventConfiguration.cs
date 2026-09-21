using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class AdminEventConfiguration : IEntityTypeConfiguration<AdminEvent>
{
    public void Configure(EntityTypeBuilder<AdminEvent> e)
    {
        e.ToTable("admin_events");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.ActorId).HasColumnName("actor_id");
        e.Property(x => x.Kind).HasColumnName("kind");
        e.Property(x => x.EntityType).HasColumnName("entity_type").HasMaxLength(32);
        e.Property(x => x.EntityId).HasColumnName("entity_id");
        e.Property(x => x.Detail).HasColumnName("detail").HasMaxLength(500);
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.HasIndex(x => x.CreatedAt);
        e.HasOne(x => x.Actor).WithMany().HasForeignKey(x => x.ActorId).OnDelete(DeleteBehavior.Cascade);
    }
}
