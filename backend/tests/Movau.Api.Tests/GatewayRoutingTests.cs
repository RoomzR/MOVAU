using Movau.Gateway;
using Xunit;

namespace Movau.Api.Tests;

public class GatewayRoutingTests
{
    [Fact]
    public void Routes_Api_To_Core_And_Hubs_To_Realtime()
    {
        Assert.Contains(GatewayRouting.Routes, r =>
            r.RouteId == "api" && r.ClusterId == "core" && r.Match.Path == "/api/{**catch-all}");
        Assert.Contains(GatewayRouting.Routes, r =>
            r.RouteId == "hubs" && r.ClusterId == "realtime" && r.Match.Path == "/hubs/{**catch-all}");
    }

    [Fact]
    public void Clusters_Point_At_Core_And_Realtime()
    {
        var clusters = GatewayRouting.Clusters("http://core:8001", "http://realtime:8002");
        var core = Assert.Single(clusters, c => c.ClusterId == "core");
        Assert.Equal("http://core:8001", core.Destinations!["d1"].Address);
        var realtime = Assert.Single(clusters, c => c.ClusterId == "realtime");
        Assert.Equal("http://realtime:8002", realtime.Destinations!["d1"].Address);
        Assert.Equal(TimeSpan.FromMinutes(10), realtime.HttpRequest!.ActivityTimeout);
    }
}
