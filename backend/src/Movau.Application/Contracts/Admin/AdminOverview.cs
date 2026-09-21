namespace Movau.Api.Contracts;

public record AdminOverview(
    int PendingIdentity,
    int OpenDisputes,
    int OpenRequests,
    int InProgressRequests,
    int UsersTotal,
    int UsersInactive);
