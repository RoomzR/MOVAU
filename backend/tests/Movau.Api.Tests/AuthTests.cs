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
    public async Task Health_Ok()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Register_Login_Me()
    {
        var email = $"user-{Guid.NewGuid():N}@example.com";
        var register = await _client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email,
            password = "password123",
            display_name = "Тэставы",
            as_executor = true,
        });
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);
        var tokens = await register.Content.ReadFromJsonAsync<JsonElement>(Json);
        var access = tokens.GetProperty("access_token").GetString();
        Assert.False(string.IsNullOrEmpty(access));

        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", access);
        var me = await _client.GetAsync("/api/v1/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);
        var body = await me.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(email, body.GetProperty("email").GetString());
        var roles = body.GetProperty("roles").EnumerateArray().Select(x => x.GetString()).ToList();
        Assert.Contains("client", roles);
        Assert.Contains("executor", roles);
        Assert.False(body.GetProperty("phone_verified").GetBoolean());
    }

    [Fact]
    public async Task Public_Profile_Hides_Email()
    {
        var headers = await RegisterAsync(asVolunteer: true);
        var me = await GetMe(headers);
        var publicProfile = await _client.GetAsync($"/api/v1/users/{me.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.OK, publicProfile.StatusCode);
        var body = await publicProfile.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.False(body.TryGetProperty("email", out _));
        Assert.False(body.TryGetProperty("phone", out _));
        Assert.Contains(body.GetProperty("roles").EnumerateArray().Select(x => x.GetString()), r => r == "volunteer");
    }

    [Fact]
    public async Task Self_Assign_Admin_Forbidden()
    {
        var headers = await RegisterAsync();
        var forbidden = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/users/me/roles", headers, new { role = "admin" }));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var added = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/users/me/roles", headers, new { role = "executor" }));
        Assert.Equal(HttpStatusCode.OK, added.StatusCode);

        var dropClient = await _client.SendAsync(Authed(HttpMethod.Delete, "/api/v1/users/me/roles/client", headers));
        Assert.Equal(HttpStatusCode.Forbidden, dropClient.StatusCode);
    }

    [Fact]
    public async Task Phone_Confirm_Hides_On_Public()
    {
        var token = await RegisterAsync();
        var digits = (Math.Abs(Guid.NewGuid().GetHashCode()) % 10_000_000).ToString("D7");
        var send = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/phone/send", token, new { phone = "8029" + digits }));
        Assert.Equal(HttpStatusCode.OK, send.StatusCode);
        Assert.Equal("123456", (await send.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("code").GetString());

        var bad = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/phone/confirm", token, new { code = "000000" }));
        Assert.Equal(HttpStatusCode.Conflict, bad.StatusCode);

        var ok = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/phone/confirm", token, new { code = "123456" }));
        Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        var me = await GetMe(token);
        Assert.True(me.GetProperty("phone_verified").GetBoolean());
        Assert.Equal("+37529" + digits, me.GetProperty("phone").GetString());

        var publicProfile = await _client.GetAsync($"/api/v1/users/{me.GetProperty("id").GetString()}");
        var card = await publicProfile.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.False(card.TryGetProperty("phone", out _));
    }

    [Fact]
    public async Task Demo_Accounts_Login()
    {
        var login = await _client.PostAsJsonAsync("/api/v1/auth/login", new { email = "admin@movau.test", password = "movau123" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var tokens = await login.Content.ReadFromJsonAsync<JsonElement>(Json);
        var me = await GetMe(tokens.GetProperty("access_token").GetString()!);
        Assert.Contains(me.GetProperty("roles").EnumerateArray().Select(x => x.GetString()), r => r == "admin");
        Assert.Equal("novice", me.GetProperty("client_level").GetString());
    }

    [Fact]
    public async Task Darma_Create_And_Take_Need_Identity()
    {
        var owner = await RegisterAsync();
        var deniedCreate = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/requests", owner, new
        {
            title = "Дарма без паспорта",
            description = "Забрать пакет у метро и принести домой.",
            category = "errand",
            latitude = 53.9023,
            longitude = 27.5619,
        }));
        Assert.Equal(HttpStatusCode.Forbidden, deniedCreate.StatusCode);

        await MarkVerifiedAsync(owner);
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Дарма после проверки");
        var executor = await RegisterAsync(asExecutor: true);
        var deniedTake = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{created.GetProperty("id").GetGuid()}/take", executor));
        Assert.Equal(HttpStatusCode.Forbidden, deniedTake.StatusCode);

        await MarkVerifiedAsync(executor);
        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{created.GetProperty("id").GetGuid()}/take", executor));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);
    }

    [Fact]
    public async Task Paid_Create_And_Take_Need_Identity()
    {
        var owner = await RegisterAsync();
        var deniedCreate = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/requests", owner, new
        {
            title = "Платная без паспорта",
            description = "Забрать пакет у метро и принести домой.",
            category = "errand",
            latitude = 53.9023,
            longitude = 27.5619,
            price = 15,
        }));
        Assert.Equal(HttpStatusCode.Forbidden, deniedCreate.StatusCode);
        var createBody = await deniedCreate.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("Сначала подтвердите личность", createBody.GetProperty("detail").GetString());

        await MarkVerifiedAsync(owner);
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/wallet/topup", owner, new { amount = 40 }));
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Платная после проверки", 15);
        var executor = await RegisterAsync(asExecutor: true);
        var deniedTake = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{created.GetProperty("id").GetGuid()}/take", executor));
        Assert.Equal(HttpStatusCode.Forbidden, deniedTake.StatusCode);

        await MarkVerifiedAsync(executor);
        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{created.GetProperty("id").GetGuid()}/take", executor));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);
    }

    [Fact]
    public async Task Identity_Submit_Review_And_Duplicate_Number()
    {
        var user = await RegisterAsync();
        var photo = TinyJpeg();
        var personal = Guid.NewGuid().ToString("N")[..14].ToUpperInvariant();
        var submit = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/identity/me", user, new
        {
            document_kind = "passport_by",
            full_name = "Иван Тестов",
            personal_number = personal,
            document_number = "MP1111111",
            document = photo,
            selfie = photo,
        }));
        Assert.Equal(HttpStatusCode.Created, submit.StatusCode);
        var pending = await submit.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("pending", pending.GetProperty("status").GetString());
        Assert.Equal(IdentityOps.MaskPersonal(personal), pending.GetProperty("personal_masked").GetString());
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/identity/me/document", user))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/identity/me/selfie", user))).StatusCode);

        var staff = await RegisterAsync();
        await GrantAdminAsync(staff);
        var me = await GetMe(user);
        var queue = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/admin/identity", staff));
        Assert.Equal(HttpStatusCode.OK, queue.StatusCode);
        var rows = (await queue.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("items").EnumerateArray().ToList();
        var id = rows.First(row => row.GetProperty("user_id").GetString() == me.GetProperty("id").GetString()).GetProperty("id").GetGuid();

        var approved = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/admin/identity/{id}/review", staff, new
        {
            decision = "verified",
        }));
        Assert.Equal(HttpStatusCode.OK, approved.StatusCode);

        var again = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/identity/me", user, new
        {
            document_kind = "passport_by",
            full_name = "Иван Тестов",
            personal_number = personal,
            document_number = "MP1111111",
            document = photo,
            selfie = photo,
        }));
        Assert.Equal(HttpStatusCode.Conflict, again.StatusCode);

        var other = await RegisterAsync();
        var clash = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/identity/me", other, new
        {
            document_kind = "passport_by",
            full_name = "Пётр Другой",
            personal_number = personal,
            document_number = "MP2222222",
            document = photo,
            selfie = photo,
        }));
        Assert.Equal(HttpStatusCode.Conflict, clash.StatusCode);
    }
}

