namespace Movau.Api.Domain;

public class Offer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HelpRequestId { get; set; }
    public Guid ExecutorId { get; set; }
    public string? Message { get; set; }
    public OfferStatus Status { get; set; } = OfferStatus.Pending;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public HelpRequest HelpRequest { get; set; } = null!;
    public User Executor { get; set; } = null!;
}
