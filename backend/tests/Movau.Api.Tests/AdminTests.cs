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
    public async Task Admin_Grant_Revoke_Role()
    {
        var admin = await RegisterAsync();
        await GrantAdminAsync(admin);
        var mod = await RegisterAsync();
        await GrantRoleAsync(mod, UserRole.Moderator);
        var target = await RegisterAsync();
        var targetId = (await GetMe(target)).GetProperty("id").GetGuid();

        var asUser = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{targetId}/roles", target, new { role = "moderator" }));
        Assert.Equal(HttpStatusCode.Forbidden, asUser.StatusCode);
        var asMod = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{targetId}/roles", mod, new { role = "moderator" }));
        Assert.Equal(HttpStatusCode.Forbidden, asMod.StatusCode);
        var asModExec = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{targetId}/roles", mod, new { role = "executor" }));
        Assert.Equal(HttpStatusCode.OK, asModExec.StatusCode);
        var asModAnalyst = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{targetId}/roles", mod, new { role = "analyst" }));
        Assert.Equal(HttpStatusCode.Forbidden, asModAnalyst.StatusCode);

        var granted = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{targetId}/roles", admin, new { role = "analyst" }));
        Assert.Equal(HttpStatusCode.OK, granted.StatusCode);
        Assert.Contains((await granted.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("roles").EnumerateArray().Select(r => r.GetString()), x => x == "analyst");

        var selfDenied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{(await GetMe(admin)).GetProperty("id").GetGuid()}/roles", admin, new { role = "moderator" }));
        Assert.Equal(HttpStatusCode.Conflict, selfDenied.StatusCode);

        var asAdmin = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{targetId}/roles", admin, new { role = "admin" }));
        Assert.Equal(HttpStatusCode.Forbidden, asAdmin.StatusCode);

        var events = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/events", admin));
        var eventPage = await events.Content.ReadFromJsonAsync<JsonElement>(Json);
        var kinds = eventPage.GetProperty("items").EnumerateArray().Select(r => r.GetProperty("kind").GetString()).ToList();
        Assert.Contains("user_role_granted", kinds);
        var adminEmail = (await GetMe(admin)).GetProperty("email").GetString()!;
        Assert.Contains(eventPage.GetProperty("items").EnumerateArray(), r =>
            r.GetProperty("kind").GetString() == "user_role_granted"
            && r.GetProperty("actor_email").GetString() == adminEmail);
        var byEmail = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/admin/events?q={Uri.EscapeDataString(adminEmail)}", admin));
        Assert.True((await byEmail.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("total").GetInt32() >= 1);

        var revoked = await _client.SendAsync(Authed(HttpMethod.Delete, $"/api/v1/admin/users/{targetId}/roles/analyst", admin));
        Assert.Equal(HttpStatusCode.OK, revoked.StatusCode);
        Assert.DoesNotContain((await revoked.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("roles").EnumerateArray().Select(r => r.GetString()), x => x == "analyst");
        var after = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/events", admin));
        var afterKinds = (await after.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("items").EnumerateArray().Select(r => r.GetProperty("kind").GetString()).ToList();
        Assert.Contains("user_role_revoked", afterKinds);
    }

    [Fact]
    public async Task Admin_Forbidden_For_Regular_User()
    {
        var user = await RegisterAsync();
        var denied = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/requests", user));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        var usersDenied = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/users", user));
        Assert.Equal(HttpStatusCode.Forbidden, usersDenied.StatusCode);
    }

    [Fact]
    public async Task Admin_List_And_Cancel()
    {
        var staff = await RegisterAsync();
        await GrantAdminAsync(staff);
        var owner = await RegisterAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "На модерацию");
        var requestId = created.GetProperty("id").GetGuid();

        var list = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/requests", staff));
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var listed = await list.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Contains(listed.GetProperty("items").EnumerateArray(), r => r.GetProperty("id").GetGuid() == requestId);

        var users = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/users", staff));
        Assert.Equal(HttpStatusCode.OK, users.StatusCode);
        Assert.True((await users.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("total").GetInt32() >= 1);

        var cancelled = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/requests/{requestId}/cancel", staff));
        Assert.Equal(HttpStatusCode.OK, cancelled.StatusCode);
        Assert.Equal("cancelled", (await cancelled.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Admin_Forbidden_Overview_And_User_Search()
    {
        var user = await RegisterAsync();
        var overview = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/overview", user));
        Assert.Equal(HttpStatusCode.Forbidden, overview.StatusCode);
        var search = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/users?q=test", user));
        Assert.Equal(HttpStatusCode.Forbidden, search.StatusCode);
    }

    [Fact]
    public async Task Admin_User_Search_And_Activate()
    {
        var staff = await RegisterAsync();
        await GrantAdminAsync(staff);
        var target = await RegisterAsync();
        var me = await GetMe(target);
        var email = me.GetProperty("email").GetString()!;
        var userId = me.GetProperty("id").GetGuid();

        var found = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/admin/users?q={Uri.EscapeDataString(email)}", staff));
        Assert.Equal(HttpStatusCode.OK, found.StatusCode);
        var page = await found.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(1, page.GetProperty("total").GetInt32());
        Assert.Equal(email, page.GetProperty("items").EnumerateArray().First().GetProperty("email").GetString());

        var off = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{userId}/deactivate", staff));
        Assert.Equal(HttpStatusCode.OK, off.StatusCode);
        Assert.False((await off.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("is_active").GetBoolean());

        var on = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/users/{userId}/activate", staff));
        Assert.Equal(HttpStatusCode.OK, on.StatusCode);
        Assert.True((await on.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("is_active").GetBoolean());

        var events = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/events", staff));
        var eventPage = await events.Content.ReadFromJsonAsync<JsonElement>(Json);
        var kinds = eventPage.GetProperty("items").EnumerateArray().Select(r => r.GetProperty("kind").GetString()).ToList();
        Assert.Contains("user_deactivated", kinds);
        Assert.Contains("user_activated", kinds);
        var staffEmail = (await GetMe(staff)).GetProperty("email").GetString()!;
        Assert.Contains(eventPage.GetProperty("items").EnumerateArray(), r => r.GetProperty("actor_email").GetString() == staffEmail);
        var byEmail = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/admin/events?q={Uri.EscapeDataString(staffEmail)}", staff));
        Assert.True((await byEmail.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("total").GetInt32() >= 1);
    }

    [Fact]
    public async Task Admin_Identity_Verified_Search_And_Dispute_Resolve()
    {
        var owner = await RegisterAsync();
        var photo = TinyJpeg();
        var personal = Guid.NewGuid().ToString("N")[..14].ToUpperInvariant();
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/identity/me", owner, new
        {
            document_kind = "passport_by",
            full_name = "Иван Поиск",
            personal_number = personal,
            document_number = "MP3333333",
            document = photo,
            selfie = photo,
        }));
        var staff = await RegisterAsync();
        await GrantAdminAsync(staff);
        var ownerMe = await GetMe(owner);
        var email = ownerMe.GetProperty("email").GetString()!;
        var pending = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/admin/identity?q={Uri.EscapeDataString(email)}", staff));
        pending.EnsureSuccessStatusCode();
        var pendingId = (await pending.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("items").EnumerateArray()
            .First(row => row.GetProperty("user_id").GetString() == ownerMe.GetProperty("id").GetString())
            .GetProperty("id").GetGuid();
        var reviewed = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/identity/{pendingId}/review", staff, new { decision = "verified" }));
        reviewed.EnsureSuccessStatusCode();

        var verified = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/admin/identity?status=verified&q={Uri.EscapeDataString(email)}", staff));
        verified.EnsureSuccessStatusCode();
        var verifiedPage = await verified.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Contains(
            verifiedPage.GetProperty("items").EnumerateArray(),
            row => row.GetProperty("id").GetGuid() == pendingId);
        var stillPending = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/identity", staff));
        Assert.DoesNotContain(
            (await stillPending.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("items").EnumerateArray(),
            row => row.GetProperty("id").GetGuid() == pendingId);

        var created = await CreateRequest(owner, 53.9023, 27.5619, "Спорная заявка");
        var requestId = created.GetProperty("id").GetGuid();
        var executor = await RegisterExecutorAsync();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", executor));
        var opened = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/disputes", owner, new { reason = "Не пришёл вовремя к дому" }));
        Assert.Equal(HttpStatusCode.Created, opened.StatusCode);
        var disputeId = (await opened.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();

        var empty = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/disputes/{disputeId}/resolve", staff, new { resolution = "" }));
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        var closed = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/disputes/{disputeId}/resolve", staff, new { resolution = "Разобрали, возврат не нужен" }));
        Assert.Equal(HttpStatusCode.OK, closed.StatusCode);
        Assert.Equal("resolved", (await closed.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("status").GetString());
    }
}

