using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class ChatMessageConfiguration : IEntityTypeConfiguration<ChatMessage>
{
    public void Configure(EntityTypeBuilder<ChatMessage> e)
    {
        e.ToTable("messages");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.HelpRequestId).HasColumnName("help_request_id");
        e.Property(x => x.AuthorId).HasColumnName("author_id");
        e.Property(x => x.Body).HasColumnName("body").HasMaxLength(2000);
        e.Property(x => x.ImageBytes).HasColumnName("image_bytes");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.HasOne(x => x.HelpRequest).WithMany(x => x.Messages).HasForeignKey(x => x.HelpRequestId);
        e.HasOne(x => x.Author).WithMany().HasForeignKey(x => x.AuthorId);
    }
}
