namespace Movau.Api.Contracts;

public record RegisterRequest(
    string Email,
    string Password,
    string DisplayName,
    string? Phone = null,
    bool AsExecutor = false,
    bool AsVolunteer = false);
