namespace Movau.Api.Contracts;

public record HelpRequestCreate(
    string Title,
    string Description,
    string Category,
    double Latitude,
    double Longitude,
    string? AddressText,
    decimal? Price);
