namespace Movau.Api.Domain;

public class IdentityVerification
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public IdentityDocumentKind DocumentKind { get; set; } = IdentityDocumentKind.PassportBy;
    public string FullName { get; set; } = "";
    public string PersonalNumber { get; set; } = "";
    public string PersonalHash { get; set; } = "";
    public string DocumentNumber { get; set; } = "";
    public byte[]? DocumentBytes { get; set; }
    public byte[]? SelfieBytes { get; set; }
    public IdentityStatus Status { get; set; } = IdentityStatus.Pending;
    public string? RejectReason { get; set; }
    public Guid? ReviewedBy { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public User User { get; set; } = null!;
}
