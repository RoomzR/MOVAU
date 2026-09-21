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

public partial class ApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
    };

    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public ApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterExecutorAsync()
    {
        var token = await RegisterAsync(asExecutor: true);
        await MarkVerifiedAsync(token);
        return token;
    }

    private async Task<string> RegisterAsync(bool asExecutor = false, bool asVolunteer = false)
    {
        var response = await _client.PostAsJsonAsync("/api/v1/auth/register", new
        {
            email = $"user-{Guid.NewGuid():N}@example.com",
            password = "password123",
            display_name = asExecutor ? "Исполнитель" : "Клиент",
            as_executor = asExecutor,
            as_volunteer = asVolunteer,
        });
        response.EnsureSuccessStatusCode();
        var tokens = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        return tokens.GetProperty("access_token").GetString()!;
    }

    private async Task<JsonElement> GetMe(string token)
    {
        var response = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/users/me", token));
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Json);
    }

    private async Task GrantAdminAsync(string token) => await GrantRoleAsync(token, UserRole.Admin);

    private async Task GrantRoleAsync(string token, UserRole role)
    {
        var me = await GetMe(token);
        var userId = Guid.Parse(me.GetProperty("id").GetString()!);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        if (!await db.UserRoles.AnyAsync(r => r.UserId == userId && r.Role == role))
        {
            db.UserRoles.Add(new UserRoleAssignment { UserId = userId, Role = role });
            await db.SaveChangesAsync();
        }
    }

    private async Task<List<string>> InboxKinds(string token)
    {
        var inbox = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/notifications?unread=true", token));
        inbox.EnsureSuccessStatusCode();
        return (await inbox.Content.ReadFromJsonAsync<JsonElement>(Json))
            .GetProperty("items").EnumerateArray()
            .Select(row => row.GetProperty("kind").GetString()!)
            .ToList();
    }

    private static object BatchItem(string title, double latitude = 53.9023, double longitude = 27.5619) => new
    {
        title,
        description = "Пакет: коробки готовы, развезти по адресам центра.",
        category = "errand",
        latitude,
        longitude,
        address_text = title,
    };

    private async Task MarkVerifiedAsync(string token)
    {
        var me = await GetMe(token);
        var userId = Guid.Parse(me.GetProperty("id").GetString()!);
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var existing = await db.IdentityVerifications.FirstOrDefaultAsync(row => row.UserId == userId);
        if (existing is { Status: IdentityStatus.Verified })
        {
            return;
        }
        var personal = userId.ToString("N")[..14].ToUpperInvariant();
        var now = DateTimeOffset.UtcNow;
        if (existing is null)
        {
            db.IdentityVerifications.Add(new IdentityVerification
            {
                UserId = userId,
                DocumentKind = IdentityDocumentKind.PassportBy,
                FullName = me.GetProperty("display_name").GetString() ?? "Тест",
                PersonalNumber = personal,
                PersonalHash = IdentityOps.HashPersonal(personal),
                DocumentNumber = "MP" + personal[..7],
                Status = IdentityStatus.Verified,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        else
        {
            existing.Status = IdentityStatus.Verified;
            existing.PersonalNumber = personal;
            existing.PersonalHash = IdentityOps.HashPersonal(personal);
            existing.RejectReason = null;
            existing.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
    }

    private async Task<JsonElement> CreateRequest(string token, double lat, double lng, string title, decimal? price = null, string category = "errand")
    {
        await MarkVerifiedAsync(token);
        var response = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/requests", token, new
        {
            title,
            description = "Забрать пакет у метро и принести домой.",
            category,
            latitude = lat,
            longitude = lng,
            price,
        }));
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JsonElement>(Json);
    }

    private HubConnection ConnectHub(string token)
    {
        var url = new Uri(_factory.Server.BaseAddress, $"hubs/chat?access_token={Uri.EscapeDataString(token)}");
        return new HubConnectionBuilder()
            .WithUrl(url, options =>
            {
                options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
            })
            .Build();
    }

    private static string TinyJpeg() =>
        "data:image/jpeg;base64," + Convert.ToBase64String(Enumerable.Repeat((byte)0xFF, 64).ToArray());

    private static object ProofPhoto() => new
    {
        body = "Сделано",
        image = "data:image/jpeg;base64," + Convert.ToBase64String(Enumerable.Repeat((byte)0xFF, 64).ToArray()),
    };

    private static HttpRequestMessage Authed(HttpMethod method, string url, string token, object? body = null)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }
        return request;
    }
}

