namespace Movau.Api.Contracts;

public record AdminPage<T>(List<T> Items, int Total, int Limit, int Offset);
