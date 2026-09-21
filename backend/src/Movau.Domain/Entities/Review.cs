namespace Movau.Api.Domain;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HelpRequestId { get; set; }
    public Guid AuthorId { get; set; }
    public Guid SubjectId { get; set; }
    public int Score { get; set; }
    public string? Comment { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public HelpRequest HelpRequest { get; set; } = null!;
    public User Author { get; set; } = null!;
    public User Subject { get; set; } = null!;
}
