namespace Movau.Api.Contracts;

public record AdminEventPublic(
    Guid Id,
    Guid ActorId,
    string ActorDisplayName,
    string ActorEmail,
    string Kind,
    string EntityType,
    Guid EntityId,
    string Detail,
    string CreatedAt);
