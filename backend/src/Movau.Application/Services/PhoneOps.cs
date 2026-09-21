using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Movau.Api.Data;
using Movau.Api.Infrastructure;
using StackExchange.Redis;

namespace Movau.Api.Services;

public static class PhoneOps
{
    public const string DemoCode = "123456";
    private static readonly Regex Mobile = new(@"^375(25|29|33|44)\d{7}$", RegexOptions.Compiled);

    public static string Normalize(string raw)
    {
        var digits = new string((raw ?? "").Where(char.IsDigit).ToArray());
        if (digits.StartsWith("80", StringComparison.Ordinal) && digits.Length == 11)
        {
            digits = "375" + digits[2..];
        }
        else if (digits.Length == 9 && digits[0] is '2' or '3' or '4')
        {
            digits = "375" + digits;
        }
        if (!Mobile.IsMatch(digits))
        {
            throw new AppException(400, "Нужен белорусский мобильный +375");
        }
        return "+" + digits;
    }

    public static async Task EnsureUniqueAsync(AppDbContext db, string phone, Guid userId)
    {
        if (await db.Users.AnyAsync(u => u.Phone == phone && u.Id != userId))
        {
            throw new AppException(409, "Телефон уже занят");
        }
    }

    public static async Task StorePendingAsync(IConnectionMultiplexer redis, Guid userId, string phone)
    {
        var json = JsonSerializer.Serialize(new Pending(phone, DemoCode));
        await redis.GetDatabase().StringSetAsync($"phone:{userId}", json, TimeSpan.FromMinutes(5));
    }

    public static async Task<string> TakePendingAsync(IConnectionMultiplexer redis, Guid userId, string code)
    {
        var raw = await redis.GetDatabase().StringGetAsync($"phone:{userId}");
        if (raw.IsNullOrEmpty)
        {
            throw new AppException(409, "Сначала запросите код");
        }
        var pending = JsonSerializer.Deserialize<Pending>(raw!)
            ?? throw new AppException(409, "Сначала запросите код");
        if (!string.Equals(pending.Code, code?.Trim(), StringComparison.Ordinal))
        {
            throw new AppException(409, "Неверный код");
        }
        await redis.GetDatabase().KeyDeleteAsync($"phone:{userId}");
        return pending.Phone;
    }

    private record Pending(string Phone, string Code);
}
