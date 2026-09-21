namespace Movau.Api.Domain;

public class UserRoleAssignment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public UserRole Role { get; set; }
    public User User { get; set; } = null!;
}
