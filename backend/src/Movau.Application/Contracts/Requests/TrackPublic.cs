namespace Movau.Api.Contracts;

public record TrackPublic(Guid HelpRequestId, double Latitude, double Longitude, string UpdatedAt, string? EtaAt = null);
