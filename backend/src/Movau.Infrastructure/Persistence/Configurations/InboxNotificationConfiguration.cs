using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class InboxNotificationConfiguration : IEntityTypeConfiguration<InboxNotification>
{
    public void Configure(EntityTypeBuilder<InboxNotification> e)
    {
        e.ToTable("notifications");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.UserId).HasColumnName("user_id");
        e.Property(x => x.Kind).HasColumnName("kind");
        e.Property(x => x.Title).HasColumnName("title").HasMaxLength(140);
        e.Property(x => x.Body).HasColumnName("body").HasMaxLength(500);
        e.Property(x => x.Href).HasColumnName("href").HasMaxLength(255);
        e.Property(x => x.ReadAt).HasColumnName("read_at");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.HasIndex(x => new { x.UserId, x.CreatedAt });
        e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
