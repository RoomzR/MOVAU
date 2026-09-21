using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Movau.Api.Domain;

namespace Movau.Api.Data;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> e)
    {
        e.ToTable("users");
        e.HasKey(x => x.Id);
        e.Property(x => x.Id).HasColumnName("id");
        e.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
        e.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(32);
        e.Property(x => x.PhoneVerifiedAt).HasColumnName("phone_verified_at");
        e.Property(x => x.HashedPassword).HasColumnName("hashed_password").HasMaxLength(255).IsRequired();
        e.Property(x => x.DisplayName).HasColumnName("display_name").HasMaxLength(80).IsRequired();
        e.Property(x => x.Bio).HasColumnName("bio").HasMaxLength(280);
        e.Property(x => x.Skills).HasColumnName("skills").HasMaxLength(280);
        e.Property(x => x.IsActive).HasColumnName("is_active");
        e.Property(x => x.CreatedAt).HasColumnName("created_at");
        e.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        e.HasIndex(x => x.Email).IsUnique();
        e.HasIndex(x => x.Phone).IsUnique();
        e.HasMany(x => x.Roles).WithOne(x => x.User).HasForeignKey(x => x.UserId);
    }
}
