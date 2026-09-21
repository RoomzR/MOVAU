using System.Text.RegularExpressions;

namespace Movau.Api.Infrastructure;

public class Settings
{
    public string DatabaseUrl { get; set; } = "postgresql://movau:movau@localhost:5432/movau";
    public string RedisUrl { get; set; } = "redis://localhost:6379/0";
    public string JwtSecret { get; set; } = "change-me";
    public string JwtAlgorithm { get; set; } = "HS256";
    public int JwtAccessTtlMinutes { get; set; } = 30;
    public int JwtRefreshTtlDays { get; set; } = 7;
    public string CorsOrigins { get; set; } = "http://localhost:5173";
    public string OsrmUrl { get; set; } = "https://router.project-osrm.org";
    public bool EmbedRealtime { get; set; } = true;

    public string[] CorsOriginList =>
        CorsOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    public string NpgsqlConnection
    {
        get
        {
            var raw = DatabaseUrl
                .Replace("postgresql+asyncpg://", "postgresql://")
                .Replace("postgresql+psycopg://", "postgresql://");
            var match = Regex.Match(
                raw,
                @"^postgres(?:ql)?://(?<user>[^:]+):(?<pass>[^@]+)@(?<host>[^:/]+):?(?<port>\d+)?/(?<db>[^?]+)");
            if (!match.Success)
            {
                return raw;
            }
            var port = string.IsNullOrEmpty(match.Groups["port"].Value) ? "5432" : match.Groups["port"].Value;
            return $"Host={match.Groups["host"].Value};Port={port};Database={match.Groups["db"].Value};Username={match.Groups["user"].Value};Password={match.Groups["pass"].Value}";
        }
    }

    public static Settings FromEnvironment()
    {
        return new Settings
        {
            DatabaseUrl = Env("DATABASE_URL", "postgresql://movau:movau@localhost:5432/movau"),
            RedisUrl = Env("REDIS_URL", "redis://localhost:6379/0"),
            JwtSecret = Env("JWT_SECRET", "change-me"),
            JwtAlgorithm = Env("JWT_ALGORITHM", "HS256"),
            JwtAccessTtlMinutes = int.Parse(Env("JWT_ACCESS_TTL_MINUTES", "30")),
            JwtRefreshTtlDays = int.Parse(Env("JWT_REFRESH_TTL_DAYS", "7")),
            CorsOrigins = Env("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"),
            OsrmUrl = Env("OSRM_URL", "https://router.project-osrm.org"),
            EmbedRealtime = !string.Equals(Env("EMBED_REALTIME", "true"), "false", StringComparison.OrdinalIgnoreCase),
        };
    }

    public static string ParseRedis(string url)
    {
        var trimmed = url.Replace("redis://", "");
        var host = trimmed.Split('/')[0];
        return $"{host},abortConnect=false";
    }

    private static string Env(string key, string fallback) =>
        Environment.GetEnvironmentVariable(key) is { Length: > 0 } value ? value : fallback;
}
