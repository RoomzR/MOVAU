namespace Movau.Api.Infrastructure;

public static class ImagePayload
{
    public const int MaxBytes = 400_000;

    public static byte[]? Parse(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return null;
        }
        var comma = raw.IndexOf(',');
        var header = comma > 0 ? raw[..comma].ToLowerInvariant() : "";
        var data = comma > 0 ? raw[(comma + 1)..] : raw;
        if (header.Length > 0
            && !header.Contains("image/jpeg", StringComparison.Ordinal)
            && !header.Contains("image/jpg", StringComparison.Ordinal)
            && !header.Contains("image/png", StringComparison.Ordinal)
            && !header.Contains("image/webp", StringComparison.Ordinal))
        {
            throw new AppException(400, "Нужен JPEG, PNG или WebP");
        }
        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(data);
        }
        catch (FormatException)
        {
            throw new AppException(400, "Некорректное фото");
        }
        if (bytes.Length is < 32 or > MaxBytes)
        {
            throw new AppException(400, "Фото слишком большое или пустое");
        }
        return bytes;
    }

    public static string Mime(byte[] bytes)
    {
        if (bytes.Length >= 3 && bytes[0] == 0xFF && bytes[1] == 0xD8)
        {
            return "image/jpeg";
        }
        if (bytes.Length >= 4 && bytes[0] == 0x89 && bytes[1] == 0x50)
        {
            return "image/png";
        }
        return "application/octet-stream";
    }
}
