namespace Movau.Api.Domain;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string? Phone { get; set; }
    public DateTimeOffset? PhoneVerifiedAt { get; set; }
    public string HashedPassword { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string? Bio { get; set; }
    public string? Skills { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<UserRoleAssignment> Roles { get; set; } = [];
}
