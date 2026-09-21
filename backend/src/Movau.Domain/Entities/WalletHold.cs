namespace Movau.Api.Domain;

public class WalletHold
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HelpRequestId { get; set; }
    public Guid PayerId { get; set; }
    public Guid? PayeeId { get; set; }
    public decimal Amount { get; set; }
    public WalletHoldStatus Status { get; set; } = WalletHoldStatus.Held;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public HelpRequest HelpRequest { get; set; } = null!;
}
