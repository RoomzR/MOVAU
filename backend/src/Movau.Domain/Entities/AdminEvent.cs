namespace Movau.Api.Domain;

public class AdminEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ActorId { get; set; }
    public AdminEventKind Kind { get; set; }
    public string EntityType { get; set; } = "";
    public Guid EntityId { get; set; }
    public string Detail { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public User Actor { get; set; } = null!;
}
