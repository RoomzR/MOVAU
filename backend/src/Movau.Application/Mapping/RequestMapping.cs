using System.Security.Cryptography;
using Movau.Api.Contracts;
using Movau.Api.Domain;

namespace Movau.Api.Services;

public static partial class Mapping
{
    public static HelpRequestPublic ToPublic(
        HelpRequest item,
        int? distanceM = null,
        string? holdStatus = null,
        string? paymentStatus = null,
        string? qrPayload = null,
        string? code = null,
        string? etaAt = null,
        bool hasProof = false,
        string? contactPhone = null,
        bool? contactPhoneVerified = null) => new(
        item.Id,
        item.ClientId,
        item.Title,
        item.Description,
        item.Category,
        StatusName(item.Status),
        item.Location.Y,
        item.Location.X,
        item.AddressText,
        item.Price,
        item.CreatedAt.ToString("O"),
        distanceM,
        item.ExecutorId,
        holdStatus,
        paymentStatus ?? (item.Price is not > 0 ? "free" : holdStatus ?? "unpaid"),
        qrPayload,
        code,
        etaAt ?? item.EtaAt?.ToString("O"),
        hasProof,
        contactPhone,
        contactPhoneVerified);

    /* QR-секрет только автору заявки */
    public static HelpRequestPublic ToPublicForViewer(
        HelpRequest item,
        int? distanceM,
        WalletHold? hold,
        Guid? viewerId,
        string origin,
        bool hasProof = false,
        string? contactPhone = null,
        bool? contactPhoneVerified = null)
    {
        var includeSecret = viewerId is not null && viewerId == item.ClientId && item.PaymentCode.Length > 0;
        var code = includeSecret ? item.PaymentCode : null;
        var payload = code is null ? null : $"{origin.TrimEnd('/')}/scan/{code}";
        return ToPublic(
            item,
            distanceM,
            hold is null ? null : HoldName(hold.Status),
            PaymentStatus(item, hold),
            payload,
            code,
            item.EtaAt?.ToString("O"),
            hasProof,
            contactPhone,
            contactPhoneVerified);
    }

    public static string NewPaymentCode() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
}
