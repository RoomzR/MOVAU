using Movau.Api.Contracts;
using Movau.Api.Domain;

namespace Movau.Api.Services;

public static partial class Mapping
{
    public static string PaymentStatus(HelpRequest item, WalletHold? hold) =>
        item.Price is not > 0
            ? "free"
            : hold is null
                ? "unpaid"
                : HoldName(hold.Status);

    public static PaymentPublic ToPayment(HelpRequest item, WalletHold? hold, bool includeSecret, string origin)
    {
        var status = PaymentStatus(item, hold);
        var purpose = includeSecret
            ? "Покажите этот QR исполнителю, когда работа будет сделана"
            : "QR видит только автор заявки";
        var code = includeSecret && item.PaymentCode.Length > 0 ? item.PaymentCode : null;
        var payload = code is null ? null : $"{origin.TrimEnd('/')}/scan/{code}";
        return new PaymentPublic(
            item.Id,
            item.Title,
            item.Price,
            "BYN",
            purpose,
            status,
            payload,
            code,
            StatusName(item.Status));
    }

    public static ScanPreview ToScanPreview(HelpRequest item, WalletHold? hold, bool claimable, bool needsPhoto) => new(
        item.Id,
        item.Title,
        item.Price,
        "BYN",
        StatusName(item.Status),
        PaymentStatus(item, hold),
        item.ExecutorId,
        claimable,
        needsPhoto);
}
