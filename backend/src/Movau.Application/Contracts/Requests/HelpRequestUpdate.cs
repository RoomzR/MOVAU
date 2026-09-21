using Movau.Api.Domain;

namespace Movau.Api.Contracts;

public record HelpRequestUpdate(
    string? Title,
    string? Description,
    string? Category,
    double? Latitude,
    double? Longitude,
    string? AddressText,
    decimal? Price,
    HelpRequestStatus? Status);
