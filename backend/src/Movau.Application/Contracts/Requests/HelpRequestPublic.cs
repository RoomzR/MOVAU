namespace Movau.Api.Contracts;

public record HelpRequestPublic(
    Guid Id,
    Guid ClientId,
    string Title,
    string Description,
    string Category,
    string Status,
    double Latitude,
    double Longitude,
    string? AddressText,
    decimal? Price,
    string CreatedAt,
    int? DistanceM,
    Guid? ExecutorId,
    string? HoldStatus,
    string? PaymentStatus = null,
    string? QrPayload = null,
    string? Code = null,
    string? EtaAt = null,
    bool HasProof = false,
    string? ContactPhone = null,
    bool? ContactPhoneVerified = null);
