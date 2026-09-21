using NetTopologySuite.Geometries;

namespace Movau.Api.Domain;

public class HelpRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ClientId { get; set; }
    public Guid? ExecutorId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "other";
    public HelpRequestStatus Status { get; set; } = HelpRequestStatus.Open;
    public Point Location { get; set; } = default!;
    public string? AddressText { get; set; }
    public decimal? Price { get; set; }
    public string PaymentCode { get; set; } = "";
    public DateTimeOffset? EtaAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public User Client { get; set; } = null!;
    public User? Executor { get; set; }
    public List<Offer> Offers { get; set; } = [];
    public List<ChatMessage> Messages { get; set; } = [];
    public List<Review> Reviews { get; set; } = [];
}
