namespace Movau.Api.Contracts;

public record AnalystMatchCtr(
    int RankedImpressions,
    int RankedClicks,
    int RankedPct,
    int RandomImpressions,
    int RandomClicks,
    int RandomPct);
