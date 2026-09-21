using Movau.Api.Contracts;
using Movau.Api.Domain;

namespace Movau.Api.Services;

public static partial class Mapping
{
    public static OfferPublic ToPublic(Offer item) => new(
        item.Id,
        item.HelpRequestId,
        item.ExecutorId,
        item.Executor.DisplayName,
        item.Message,
        OfferName(item.Status),
        item.CreatedAt.ToString("O"));

    public static MessagePublic ToPublic(ChatMessage item) => new(
        item.Id,
        item.AuthorId,
        item.Author.DisplayName,
        item.Body,
        item.CreatedAt.ToString("O"),
        item.ImageBytes is { Length: > 0 });

    public static ReviewPublic ToPublic(Review item) => new(
        item.Id,
        item.HelpRequestId,
        item.AuthorId,
        item.Author.DisplayName,
        item.SubjectId,
        item.Score,
        item.Comment,
        item.CreatedAt.ToString("O"));

    public static DisputePublic ToPublic(Dispute item) => new(
        item.Id,
        item.HelpRequestId,
        item.AuthorId,
        item.Author.DisplayName,
        item.Reason,
        DisputeName(item.Status),
        item.Resolution,
        item.CreatedAt.ToString("O"));

    public static AdminUserPublic ToAdmin(User user) => new(
        user.Id.ToString(),
        user.Email,
        user.DisplayName,
        user.IsActive,
        user.Roles.Select(r => RoleName(r.Role)).ToList(),
        user.CreatedAt.ToString("O"));
}
