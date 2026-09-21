namespace Movau.Api.Contracts;

public record TokenPair(string AccessToken, string RefreshToken, string TokenType = "bearer");
