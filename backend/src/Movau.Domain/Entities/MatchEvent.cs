namespace Movau.Api.Domain;

public class MatchEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HelpRequestId { get; set; }
    public Guid CandidateId { get; set; }
    public string Variant { get; set; } = "ranked";
    public string Kind { get; set; } = "impression";
    public DateTimeOffset CreatedAt { get; set; }
    public HelpRequest HelpRequest { get; set; } = null!;
    public User Candidate { get; set; } = null!;
}
