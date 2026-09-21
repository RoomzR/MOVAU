namespace Movau.Api.Infrastructure;

public static class PasswordService
{
    public static string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password);

    public static bool Verify(string password, string hashed)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hashed);
        }
        catch
        {
            return false;
        }
    }
}
