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
    public async Task Inbox_Take_Creates_Unread_Then_Read()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", executor));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);

        var inbox = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/notifications?unread=true", owner));
        Assert.Equal(HttpStatusCode.OK, inbox.StatusCode);
        var body = await inbox.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(1, body.GetProperty("unread_count").GetInt32());
        var note = body.GetProperty("items").EnumerateArray().First();
        Assert.Equal("request_taken", note.GetProperty("kind").GetString());
        Assert.Contains($"/requests/{requestId}", note.GetProperty("href").GetString()!);
        var noteId = note.GetProperty("id").GetGuid();

        var execInbox = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/notifications?unread=true", executor));
        Assert.Equal(0, (await execInbox.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("unread_count").GetInt32());

        var read = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/notifications/{noteId}/read", owner));
        Assert.Equal(HttpStatusCode.OK, read.StatusCode);
        var after = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/notifications?unread=true", owner));
        Assert.Equal(0, (await after.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("unread_count").GetInt32());
    }

    [Fact]
    public async Task Inbox_Offer_Accept_Start_Complete_And_Dispute()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Цикл колокола");
        var requestId = created.GetProperty("id").GetGuid();

        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        Assert.Equal(HttpStatusCode.Created, offer.StatusCode);
        Assert.Contains("offer", await InboxKinds(owner));
        Assert.DoesNotContain("offer", await InboxKinds(executor));

        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        var accepted = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        Assert.Contains("request_taken", await InboxKinds(executor));
        Assert.DoesNotContain("request_taken", await InboxKinds(owner));

        var started = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/start", executor));
        Assert.Equal(HttpStatusCode.OK, started.StatusCode);
        Assert.Contains("request_started", await InboxKinds(owner));

        var done = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/complete", executor));
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        Assert.Contains("request_completed", await InboxKinds(owner));

        var other = await CreateRequest(owner, 53.9023, 27.5619, "Спорный цикл");
        var otherId = other.GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{otherId}/take", executor));
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{otherId}/start", executor));
        var opened = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{otherId}/disputes", owner, new { reason = "Не пришёл вовремя к дому" }));
        Assert.Equal(HttpStatusCode.Created, opened.StatusCode);
        Assert.Contains("dispute_opened", await InboxKinds(executor));
        var disputeId = (await opened.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        var staff = await RegisterAsync();
        await GrantAdminAsync(staff);
        var closed = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/disputes/{disputeId}/resolve", staff, new { resolution = "Разобрали без возврата" }));
        Assert.Equal(HttpStatusCode.OK, closed.StatusCode);
        Assert.Contains("dispute_resolved", await InboxKinds(owner));
        Assert.Contains("dispute_resolved", await InboxKinds(executor));
    }
}

