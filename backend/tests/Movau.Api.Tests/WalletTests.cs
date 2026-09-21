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
    public async Task Escrow_Accept_Without_Funds()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Платная заявка", 40);
        var requestId = created.GetProperty("id").GetGuid();
        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();

        var accepted = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));
        Assert.Equal(HttpStatusCode.Conflict, accepted.StatusCode);
        var detail = await accepted.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("Недостаточно средств", detail.GetProperty("detail").GetString());

        var request = await _client.GetAsync($"/api/v1/requests/{requestId}");
        var body = await request.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("open", body.GetProperty("status").GetString());
        Assert.True(body.TryGetProperty("hold_status", out var hold) && hold.ValueKind is JsonValueKind.Null or JsonValueKind.Undefined);
    }

    [Fact]
    public async Task Escrow_Topup_Accept_Complete()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var topup = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/wallet/topup", owner, new { amount = 80 }));
        Assert.Equal(HttpStatusCode.OK, topup.StatusCode);
        Assert.Equal(80, (await topup.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("balance").GetDecimal());

        var created = await CreateRequest(owner, 53.9023, 27.5619, "Платная заявка", 25);
        var requestId = created.GetProperty("id").GetGuid();
        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();

        var accepted = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);

        var ownerWallet = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/wallet/me", owner));
        var ownerBody = await ownerWallet.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(55, ownerBody.GetProperty("balance").GetDecimal());
        Assert.Equal("held", ownerBody.GetProperty("holds").EnumerateArray().Single().GetProperty("status").GetString());
        Assert.Contains("topup", ownerBody.GetProperty("txns").EnumerateArray().Select(row => row.GetProperty("kind").GetString()).ToList());

        var request = await _client.GetAsync($"/api/v1/requests/{requestId}");
        Assert.Equal("held", (await request.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("hold_status").GetString());

        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/start", executor));
        var done = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/complete", executor));
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        Assert.Equal("released", (await done.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("hold_status").GetString());

        var executorWallet = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/wallet/me", executor));
        Assert.Equal(25, (await executorWallet.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("balance").GetDecimal());
        var ownerAfter = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/wallet/me", owner));
        Assert.Equal(55, (await ownerAfter.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("balance").GetDecimal());
    }

    [Fact]
    public async Task Pay_This_Request_Then_Assign()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Оплата по QR", 15);
        var requestId = created.GetProperty("id").GetGuid();
        Assert.False(string.IsNullOrWhiteSpace(created.GetProperty("code").GetString()));
        Assert.Equal("unpaid", created.GetProperty("payment_status").GetString());

        var unpaid = await _client.GetAsync($"/api/v1/requests/{requestId}/payment");
        var unpaidBody = await unpaid.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("unpaid", unpaidBody.GetProperty("status").GetString());
        Assert.True(unpaidBody.GetProperty("qr_payload").ValueKind is JsonValueKind.Null or JsonValueKind.Undefined
            || string.IsNullOrEmpty(unpaidBody.GetProperty("qr_payload").GetString()));

        var ownerPay = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/payment", owner));
        var ownerPayBody = await ownerPay.Content.ReadFromJsonAsync<JsonElement>(Json);
        var code = ownerPayBody.GetProperty("code").GetString();
        Assert.False(string.IsNullOrWhiteSpace(code));
        Assert.Contains($"/scan/{code}", ownerPayBody.GetProperty("qr_payload").GetString());

        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/wallet/topup", owner, new { amount = 40 }));
        var paid = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/pay", owner));
        Assert.Equal(HttpStatusCode.OK, paid.StatusCode);
        Assert.Equal("held", (await paid.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("status").GetString());

        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        var accepted = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
    }

    [Fact]
    public async Task Scan_Qr_Releases_To_Executor()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var stranger = await RegisterExecutorAsync();
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/wallet/topup", owner, new { amount = 40 }));
        var created = await CreateRequest(owner, 53.9023, 27.5619, "QR выплата", 20);
        var requestId = created.GetProperty("id").GetGuid();
        Assert.Equal("held", created.GetProperty("payment_status").GetString());
        var code = created.GetProperty("code").GetString();
        Assert.False(string.IsNullOrWhiteSpace(code));

        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));

        var withoutPhoto = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/payments/claim", executor, new { code }));
        Assert.Equal(HttpStatusCode.Conflict, withoutPhoto.StatusCode);

        var photo = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/messages", executor, ProofPhoto()));
        Assert.Equal(HttpStatusCode.Created, photo.StatusCode);

        var strangerClaim = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/payments/claim", stranger, new { code }));
        Assert.Equal(HttpStatusCode.Forbidden, strangerClaim.StatusCode);

        var claimed = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/payments/claim", executor, new { code }));
        Assert.Equal(HttpStatusCode.OK, claimed.StatusCode);
        var claimedBody = await claimed.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("completed", claimedBody.GetProperty("status").GetString());
        Assert.Equal("released", claimedBody.GetProperty("hold_status").GetString());
        Assert.Contains("payment_released", await InboxKinds(owner));

        var executorWallet = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/wallet/me", executor));
        Assert.Equal(20, (await executorWallet.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("balance").GetDecimal());
    }

    [Fact]
    public async Task Scan_Qr_Before_Assign_Is_Forbidden()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/wallet/topup", owner, new { amount = 12 }));
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Ещё не назначена", 12);
        var code = created.GetProperty("code").GetString();

        var claim = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/payments/claim", executor, new { code }));
        Assert.Equal(HttpStatusCode.Forbidden, claim.StatusCode);
    }

    [Fact]
    public async Task Escrow_Cancel_Refunds()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/wallet/topup", owner, new { amount = 30 }));
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Платная заявка", 30);
        var requestId = created.GetProperty("id").GetGuid();
        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));

        var cancelled = await _client.SendAsync(Authed(HttpMethod.Delete, $"/api/v1/requests/{requestId}", owner));
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        Assert.Equal("refunded", (await cancelled.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("hold_status").GetString());

        var wallet = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/wallet/me", owner));
        Assert.Equal(30, (await wallet.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("balance").GetDecimal());
    }

    [Fact]
    public async Task Escrow_Free_Skips_Wallet()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Дарма");
        var requestId = created.GetProperty("id").GetGuid();
        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        var accepted = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/start", executor));
        var done = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/complete", executor));
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);

        var ownerWallet = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/wallet/me", owner));
        var executorWallet = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/wallet/me", executor));
        Assert.Equal(0, (await ownerWallet.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("balance").GetDecimal());
        Assert.Equal(0, (await executorWallet.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("balance").GetDecimal());
        Assert.Equal(JsonValueKind.Null, (await done.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("hold_status").ValueKind);
    }
}

