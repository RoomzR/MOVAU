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
    public async Task Business_Batch_And_Client_Limit()
    {
        var client = await RegisterAsync();
        await CreateRequest(client, 53.9023, 27.5619, "Первая");
        await CreateRequest(client, 53.9024, 27.5620, "Вторая");
        await CreateRequest(client, 53.9025, 27.5621, "Третья");
        var fourth = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/requests", client, new
        {
            title = "Четвёртая",
            description = "Забрать пакет у метро и принести домой.",
            category = "errand",
            latitude = 53.9023,
            longitude = 27.5619,
        }));
        Assert.Equal(HttpStatusCode.Conflict, fourth.StatusCode);

        var partner = await RegisterAsync();
        await GrantRoleAsync(partner, UserRole.Business);
        await MarkVerifiedAsync(partner);
        var empty = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/business/requests", partner, new { items = Array.Empty<object>() }));
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);
        var one = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/business/requests", partner, new
        {
            items = new[] { BatchItem("Одна точка") },
        }));
        Assert.Equal(HttpStatusCode.BadRequest, one.StatusCode);

        var packed = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/business/requests", partner, new
        {
            items = new[]
            {
                BatchItem("Обед на Немиге", 53.9023, 27.5619),
                BatchItem("Обед на Победителей", 53.9168, 27.5349),
            },
        }));
        Assert.Equal(HttpStatusCode.Created, packed.StatusCode);
        var created = (await packed.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().ToList();
        Assert.Equal(2, created.Count);
        Assert.NotEqual(created[0].GetProperty("latitude").GetDouble(), created[1].GetProperty("latitude").GetDouble());
        Assert.NotEqual(created[0].GetProperty("longitude").GetDouble(), created[1].GetProperty("longitude").GetDouble());

        var list = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/business/requests", partner));
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var listBody = await list.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.True(listBody.GetProperty("total").GetInt32() >= 2);
        var listed = listBody.GetProperty("items").EnumerateArray().ToList();
        var nemiga = listed.Single(row => row.GetProperty("title").GetString() == "Обед на Немиге");
        var pobed = listed.Single(row => row.GetProperty("title").GetString() == "Обед на Победителей");
        Assert.NotEqual(nemiga.GetProperty("latitude").GetDouble(), pobed.GetProperty("latitude").GetDouble());
        Assert.NotEqual(nemiga.GetProperty("longitude").GetDouble(), pobed.GetProperty("longitude").GetDouble());
    }

    [Fact]
    public async Task Analyst_Overview_Period()
    {
        var regular = await RegisterAsync();
        var forbidden = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/analyst/overview", regular));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var analyst = await RegisterAsync();
        await GrantRoleAsync(analyst, UserRole.Analyst);
        await CreateRequest(await RegisterAsync(), 53.9023, 27.5619, "Для аналитики");

        var week = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/analyst/overview?days=7", analyst));
        Assert.Equal(HttpStatusCode.OK, week.StatusCode);
        var body = await week.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(7, body.GetProperty("days").GetInt32());
        Assert.Equal(7, body.GetProperty("series").GetArrayLength());
        Assert.True(body.GetProperty("created").GetInt32() >= 1);
        Assert.True(body.GetProperty("funnel").GetProperty("created").GetInt32() >= 1);
        Assert.InRange(body.GetProperty("complete_pct").GetInt32(), 0, 100);
        Assert.InRange(body.GetProperty("cancel_pct").GetInt32(), 0, 100);

        var clamped = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/analyst/overview?days=15", analyst));
        Assert.Equal(HttpStatusCode.OK, clamped.StatusCode);
        var clampedBody = await clamped.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(7, clampedBody.GetProperty("days").GetInt32());
        Assert.Equal(7, clampedBody.GetProperty("series").GetArrayLength());

        var quarter = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/analyst/overview?days=90", analyst));
        Assert.Equal(HttpStatusCode.OK, quarter.StatusCode);
        var q = await quarter.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal(90, q.GetProperty("days").GetInt32());
        Assert.Equal(90, q.GetProperty("series").GetArrayLength());
        Assert.True(body.GetProperty("cells").GetArrayLength() >= 1);
        Assert.Contains(body.GetProperty("cells").EnumerateArray(), c => c.GetProperty("count").GetInt32() >= 1);
        Assert.True(body.GetProperty("points").GetArrayLength() >= 1);
        Assert.True(body.TryGetProperty("match_ctr", out var ctr));
        Assert.True(ctr.GetProperty("ranked_impressions").GetInt32() >= 0);
        Assert.True(ctr.GetProperty("random_impressions").GetInt32() >= 0);
    }

    [Fact]
    public async Task Shift_Requires_Executor()
    {
        var client = await RegisterAsync();
        var denied = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/on", client, new { latitude = 53.9, longitude = 27.56 }));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);

        var executor = await RegisterExecutorAsync();
        var started = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/on", executor, new { latitude = 53.9023, longitude = 27.5619 }));
        Assert.Equal(HttpStatusCode.OK, started.StatusCode);
        var off = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/off", executor));
        Assert.Equal(HttpStatusCode.OK, off.StatusCode);
    }
}

