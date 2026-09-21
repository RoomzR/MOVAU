namespace Movau.Api.Domain;

public class Dispute
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HelpRequestId { get; set; }
    public Guid AuthorId { get; set; }
    public string Reason { get; set; } = "";
    public DisputeStatus Status { get; set; } = DisputeStatus.Open;
    public string? Resolution { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public HelpRequest HelpRequest { get; set; } = null!;
    public User Author { get; set; } = null!;
}
