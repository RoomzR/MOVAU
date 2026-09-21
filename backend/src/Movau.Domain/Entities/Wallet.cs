namespace Movau.Api.Domain;

public class Wallet
{
    public Guid UserId { get; set; }
    public decimal Balance { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public User User { get; set; } = null!;
}
