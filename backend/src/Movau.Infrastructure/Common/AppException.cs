namespace Movau.Api.Infrastructure;

public class AppException(int status, string detail) : Exception(detail)
{
    public int Status { get; } = status;
}
