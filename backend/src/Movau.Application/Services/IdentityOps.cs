using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class IdentityOps
{
    public const string RequiredMessage = "Сначала подтвердите личность";
    private static readonly Regex Personal = new("^[A-Z0-9]{8,20}$", RegexOptions.Compiled);

    public static async Task EnsureVerified(AppDbContext db, Guid userId)
    {
        var ok = await db.IdentityVerifications.AsNoTracking()
            .AnyAsync(row => row.UserId == userId && row.Status == IdentityStatus.Verified);
        if (!ok)
        {
            throw new AppException(403, RequiredMessage);
        }
    }

    public static string NormalizePersonal(string raw)
    {
        return raw.Trim().ToUpperInvariant().Replace(" ", "", StringComparison.Ordinal).Replace("-", "", StringComparison.Ordinal);
    }

    public static string HashPersonal(string normalized)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    public static string MaskPersonal(string number)
    {
        var value = NormalizePersonal(number);
        if (value.Length <= 6)
        {
            return "••••";
        }
        return "••••" + value[^6..];
    }

    public static string RequirePersonal(string? raw)
    {
        var value = NormalizePersonal(raw ?? "");
        if (!Personal.IsMatch(value))
        {
            throw new AppException(400, "Личный номер: 8–20 латинских букв и цифр");
        }
        return value;
    }

    public static string RequireName(string? raw)
    {
        var value = (raw ?? "").Trim();
        if (value.Length is < 2 or > 80)
        {
            throw new AppException(400, "ФИО как в документе: от 2 до 80 символов");
        }
        return value;
    }

    public static string RequireDocumentNumber(string? raw)
    {
        var value = (raw ?? "").Trim().ToUpperInvariant();
        if (value.Length is < 4 or > 32)
        {
            throw new AppException(400, "Номер документа: от 4 до 32 символов");
        }
        return value;
    }

    public static IdentityDocumentKind ParseKind(string? raw) => raw switch
    {
        "passport_by" => IdentityDocumentKind.PassportBy,
        "id_card_by" => IdentityDocumentKind.IdCardBy,
        "other" => IdentityDocumentKind.Other,
        _ => throw new AppException(400, "Неизвестный тип документа"),
    };

    public static string KindName(IdentityDocumentKind kind) => kind switch
    {
        IdentityDocumentKind.PassportBy => "passport_by",
        IdentityDocumentKind.IdCardBy => "id_card_by",
        IdentityDocumentKind.Other => "other",
        _ => "other",
    };

    public static string StatusName(IdentityStatus status) => status switch
    {
        IdentityStatus.Pending => "pending",
        IdentityStatus.Verified => "verified",
        IdentityStatus.Rejected => "rejected",
        _ => "none",
    };

    public static IdentityStatus ParseStatus(string? raw, IdentityStatus fallback = IdentityStatus.Pending)
    {
        var value = (raw ?? "").Trim().ToLowerInvariant();
        if (value.Length == 0)
        {
            return fallback;
        }
        return value switch
        {
            "pending" => IdentityStatus.Pending,
            "verified" => IdentityStatus.Verified,
            "rejected" => IdentityStatus.Rejected,
            _ => throw new AppException(400, "Статус: pending, verified или rejected"),
        };
    }

    public static async Task<string> OwnStatusAsync(AppDbContext db, Guid userId)
    {
        var row = await db.IdentityVerifications.AsNoTracking()
            .FirstOrDefaultAsync(item => item.UserId == userId);
        return row is null ? "none" : StatusName(row.Status);
    }

    public static async Task<string> PublicStatusAsync(AppDbContext db, Guid userId)
    {
        var ok = await db.IdentityVerifications.AsNoTracking()
            .AnyAsync(item => item.UserId == userId && item.Status == IdentityStatus.Verified);
        return ok ? "verified" : "none";
    }

    public static byte[] RequirePhoto(string? raw, string label)
    {
        return ImagePayload.Parse(raw) ?? throw new AppException(400, $"Нужно фото: {label}");
    }

    public static async Task EnsurePersonalFreeAsync(AppDbContext db, string hash, Guid userId)
    {
        var taken = await db.IdentityVerifications.AsNoTracking()
            .AnyAsync(row =>
                row.PersonalHash == hash
                && row.Status == IdentityStatus.Verified
                && row.UserId != userId);
        if (taken)
        {
            throw new AppException(409, "Этот документ уже подтверждён на другом аккаунте");
        }
    }
}
