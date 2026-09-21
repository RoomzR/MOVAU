using Movau.Api.Domain;
using Movau.Api.Infrastructure;

namespace Movau.Api.Services;

public static class RequestAccess
{
    private static readonly HelpRequestStatus[] Chatable =
        [HelpRequestStatus.Assigned, HelpRequestStatus.InProgress, HelpRequestStatus.Completed];

    public static void EnsureChatAccess(HelpRequest item, User user)
    {
        if (!Chatable.Contains(item.Status) || (item.ClientId != user.Id && item.ExecutorId != user.Id))
        {
            throw new AppException(403, "Чат доступен автору и назначенному исполнителю");
        }
    }

    public static void EnsureWatchAccess(HelpRequest item, User user)
    {
        if (item.ClientId == user.Id)
        {
            return;
        }
        EnsureChatAccess(item, user);
    }
}
