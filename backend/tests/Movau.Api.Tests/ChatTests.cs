using System.Net;
using Xunit;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Services;

namespace Movau.Api.Tests;

public partial class ApiTests
{
    [Fact]
    public async Task Reviews_After_Complete()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var stranger = await RegisterAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        var tooEarly = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/reviews", owner, new { score = 5 }));
        Assert.Equal(HttpStatusCode.Forbidden, tooEarly.StatusCode);

        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/start", executor));

        var stillEarly = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/reviews", owner, new { score = 5 }));
        Assert.Equal(HttpStatusCode.Forbidden, stillEarly.StatusCode);

        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/complete", executor));

        var denied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/reviews", stranger, new { score = 3, comment = "Чужой" }));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        var peek = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/reviews", stranger));
        Assert.Equal(HttpStatusCode.Forbidden, peek.StatusCode);

        var fromOwner = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/reviews", owner, new { score = 4, comment = "Спасибо" }));
        Assert.Equal(HttpStatusCode.Created, fromOwner.StatusCode);
        var fromExecutor = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/reviews", executor, new { score = 5 }));
        Assert.Equal(HttpStatusCode.Created, fromExecutor.StatusCode);

        var duplicate = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/reviews", owner, new { score = 2 }));
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var executorMe = await GetMe(executor);
        var profile = await _client.GetAsync($"/api/v1/users/{executorMe.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        var card = await profile.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(1, card.GetProperty("rating_count").GetInt32());
        Assert.Equal(4, card.GetProperty("karma_points").GetInt32());
        Assert.Equal(4.0, card.GetProperty("rating_avg").GetDouble());

        var aboutExecutor = await _client.GetAsync($"/api/v1/users/{executorMe.GetProperty("id").GetString()}/reviews");
        Assert.Equal(HttpStatusCode.OK, aboutExecutor.StatusCode);
        var executorReviews = (await aboutExecutor.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().ToList();
        Assert.Single(executorReviews);
        Assert.Equal(4, executorReviews[0].GetProperty("score").GetInt32());
        Assert.Equal("Спасибо", executorReviews[0].GetProperty("comment").GetString());

        var ownerMe = await GetMe(owner);
        var aboutOwner = await _client.GetAsync($"/api/v1/users/{ownerMe.GetProperty("id").GetString()}/reviews");
        Assert.Equal(HttpStatusCode.OK, aboutOwner.StatusCode);
        var ownerReviews = (await aboutOwner.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().ToList();
        Assert.Single(ownerReviews);
        Assert.Equal(5, ownerReviews[0].GetProperty("score").GetInt32());

        var missing = await _client.GetAsync($"/api/v1/users/{Guid.NewGuid()}/reviews");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Chat_After_Accept()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var stranger = await RegisterAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        var tooEarly = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/messages", owner, new { body = "Привет" }));
        Assert.Equal(HttpStatusCode.Forbidden, tooEarly.StatusCode);

        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));

        var denied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/messages", stranger, new { body = "Чужой" }));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        var peek = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/messages", stranger));
        Assert.Equal(HttpStatusCode.Forbidden, peek.StatusCode);

        var sent = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/messages", owner, new { body = "Где встретимся?" }));
        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);

        var asExecutor = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/messages", executor));
        var asOwner = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/messages", owner));
        Assert.Equal(HttpStatusCode.OK, asExecutor.StatusCode);
        Assert.Equal(HttpStatusCode.OK, asOwner.StatusCode);
        var rows = await asExecutor.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("Где встретимся?", rows.EnumerateArray().Single().GetProperty("body").GetString());
        Assert.Equal("Где встретимся?", (await asOwner.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().Single().GetProperty("body").GetString());
    }

    [Fact]
    public async Task Chat_Hub_Pushes_Message_And_Rejects_Stranger()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var stranger = await RegisterAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));

        await using var executorHub = ConnectHub(executor);
        var received = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
        executorHub.On<JsonElement>("message", dto => received.TrySetResult(dto));
        await executorHub.StartAsync();
        await executorHub.InvokeAsync("Join", requestId);

        var sent = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/messages", owner, new { body = "Где встретимся?" }));
        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);

        var pushed = await received.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal("Где встретимся?", pushed.GetProperty("body").GetString());

        await using var strangerHub = ConnectHub(stranger);
        await strangerHub.StartAsync();
        var denied = await Assert.ThrowsAsync<HubException>(() => strangerHub.InvokeAsync("Join", requestId));
        Assert.Contains("Чат доступен", denied.Message);
    }
}

