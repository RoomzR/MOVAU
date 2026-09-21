using Yarp.ReverseProxy.Configuration;
using Yarp.ReverseProxy.Forwarder;

namespace Movau.Gateway;

public static class GatewayRouting
{
    public static IReadOnlyList<RouteConfig> Routes { get; } =
    [
        new RouteConfig
        {
            RouteId = "api",
            ClusterId = "core",
            Match = new RouteMatch { Path = "/api/{**catch-all}" },
        },
        new RouteConfig
        {
            RouteId = "hubs",
            ClusterId = "realtime",
            Match = new RouteMatch { Path = "/hubs/{**catch-all}" },
        },
    ];

    public static IReadOnlyList<ClusterConfig> Clusters(string core, string realtime) =>
    [
        new ClusterConfig
        {
            ClusterId = "core",
            Destinations = new Dictionary<string, DestinationConfig>
            {
                ["d1"] = new() { Address = core },
            },
        },
        new ClusterConfig
        {
            ClusterId = "realtime",
            HttpRequest = new ForwarderRequestConfig
            {
                ActivityTimeout = TimeSpan.FromMinutes(10),
            },
            Destinations = new Dictionary<string, DestinationConfig>
            {
                ["d1"] = new() { Address = realtime },
            },
        },
    ];
}
