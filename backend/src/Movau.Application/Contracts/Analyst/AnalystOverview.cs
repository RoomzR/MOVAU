namespace Movau.Api.Contracts;

public record AnalystOverview(
    int Days,
    int Users,
    int OpenRequests,
    int OnShift,
    int OpenDisputes,
    decimal HeldAmount,
    int Created,
    int Completed,
    int Cancelled,
    int DisputesOpened,
    decimal Spent,
    List<AnalystDay> Series,
    List<AnalystCategory> Categories,
    List<AnalystCell> Cells,
    List<AnalystPoint> Points,
    AnalystFunnel Funnel,
    int CompletePct,
    int CancelPct,
    double? MedianCompleteHours,
    AnalystMatchCtr MatchCtr);
