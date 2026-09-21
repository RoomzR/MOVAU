namespace Movau.Api.Domain;

public class WalletTxn
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WalletUserId { get; set; }
    public decimal Amount { get; set; }
    public WalletTxnKind Kind { get; set; }
    public Guid? HelpRequestId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
