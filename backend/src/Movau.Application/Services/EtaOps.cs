using System.Globalization;
using System.Text.Json;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class EtaOps
{
    public const int MinMinutes = 3;
    public const int MaxMinutes = 90;
    public const double FallbackMps = 4;

    public static int Clamp(int minutes) => Math.Min(MaxMinutes, Math.Max(MinMinutes, minutes));

    public static int FallbackMinutes(int meters) =>
        Clamp((int)Math.Round(Math.Max(1, meters) / FallbackMps / 60.0));

    public static async Task<int> MinutesAsync(
        IHttpClientFactory http,
        Settings settings,
        double fromLat,
        double fromLng,
        double toLat,
        double toLng)
    {
        var meters = MatchOps.Meters(fromLat, fromLng, toLat, toLng);
        var fallback = FallbackMinutes(meters);
        try
        {
            var client = http.CreateClient("osrm");
            var from = $"{fromLng.ToString(CultureInfo.InvariantCulture)},{fromLat.ToString(CultureInfo.InvariantCulture)}";
            var to = $"{toLng.ToString(CultureInfo.InvariantCulture)},{toLat.ToString(CultureInfo.InvariantCulture)}";
            var url = $"{settings.OsrmUrl.TrimEnd('/')}/route/v1/driving/{from};{to}?overview=false";
            using var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
            {
                return fallback;
            }
            await using var stream = await response.Content.ReadAsStreamAsync();
            using var doc = await JsonDocument.ParseAsync(stream);
            if (!doc.RootElement.TryGetProperty("routes", out var routes) || routes.GetArrayLength() == 0)
            {
                return fallback;
            }
            var duration = routes[0].GetProperty("duration").GetDouble();
            return Clamp((int)Math.Round(duration / 60.0));
        }
        catch
        {
            return fallback;
        }
    }
}
