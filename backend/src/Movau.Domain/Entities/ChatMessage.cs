namespace Movau.Api.Domain;

public class ChatMessage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid HelpRequestId { get; set; }
    public Guid AuthorId { get; set; }
    public string Body { get; set; } = "";
    public byte[]? ImageBytes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public HelpRequest HelpRequest { get; set; } = null!;
    public User Author { get; set; } = null!;
}
