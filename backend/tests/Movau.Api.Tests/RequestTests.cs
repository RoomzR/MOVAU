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
    public async Task Nearby_Radius()
    {
        var headers = await RegisterAsync();
        await CreateRequest(headers, 53.9023, 27.5619, "Рядом в центре");
        await CreateRequest(headers, 52.0976, 23.7340, "Далеко в Бресте");
        var nearby = await _client.GetAsync("/api/v1/requests?lat=53.9023&lng=27.5619&radius_m=5000");
        Assert.Equal(HttpStatusCode.OK, nearby.StatusCode);
        var rows = await nearby.Content.ReadFromJsonAsync<JsonElement>(Json);
        var titles = rows.EnumerateArray().Select(r => r.GetProperty("title").GetString()).ToList();
        Assert.Contains("Рядом в центре", titles);
        Assert.DoesNotContain("Далеко в Бресте", titles);
    }

    [Fact]
    public async Task Nearby_Category_Filter()
    {
        var headers = await RegisterAsync();
        await CreateRequest(headers, 53.9023, 27.5619, "Поручение в центре");
        await CreateRequest(headers, 53.9024, 27.5620, "Капли рядом", category: "pharmacy");
        var pharmacy = await _client.GetAsync("/api/v1/requests?lat=53.9023&lng=27.5619&radius_m=5000&category=pharmacy");
        Assert.Equal(HttpStatusCode.OK, pharmacy.StatusCode);
        var titles = (await pharmacy.Content.ReadFromJsonAsync<JsonElement>(Json))
            .EnumerateArray()
            .Select(r => r.GetProperty("title").GetString())
            .ToList();
        Assert.Contains("Капли рядом", titles);
        Assert.DoesNotContain("Поручение в центре", titles);

        var unknown = await _client.GetAsync("/api/v1/requests?category=spaceship");
        Assert.Equal(HttpStatusCode.BadRequest, unknown.StatusCode);
    }

    [Fact]
    public async Task Owner_Can_Patch_Open_Request()
    {
        var owner = await RegisterAsync();
        var other = await RegisterAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Старый заголовок");
        var requestId = created.GetProperty("id").GetGuid();

        var forbidden = await _client.SendAsync(Authed(HttpMethod.Patch, $"/api/v1/requests/{requestId}", other, new { title = "Чужой заголовок" }));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var patched = await _client.SendAsync(Authed(HttpMethod.Patch, $"/api/v1/requests/{requestId}", owner, new
        {
            title = "Новый заголовок",
            latitude = 53.91,
            longitude = 27.55,
        }));
        Assert.Equal(HttpStatusCode.OK, patched.StatusCode);
        var body = await patched.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("Новый заголовок", body.GetProperty("title").GetString());
        Assert.NotEqual(created.GetProperty("latitude").GetDouble(), body.GetProperty("latitude").GetDouble());
    }

    [Fact]
    public async Task Offers_Accept_Start_Complete()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var other = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        var asClient = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", await RegisterAsync(), new { }));
        Assert.Equal(HttpStatusCode.Forbidden, asClient.StatusCode);

        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { message = "Буду" }));
        Assert.Equal(HttpStatusCode.Created, offer.StatusCode);
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();

        var listed = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/offers", owner));
        Assert.Equal(HttpStatusCode.OK, listed.StatusCode);
        var pending = (await listed.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().Single();
        Assert.Equal("pending", pending.GetProperty("status").GetString());
        Assert.Equal(offerId, pending.GetProperty("id").GetGuid());

        var withdrawn = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/withdraw", executor));
        Assert.Equal(HttpStatusCode.OK, withdrawn.StatusCode);
        Assert.Equal("withdrawn", (await withdrawn.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("status").GetString());
        var afterWithdraw = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/offers", owner));
        Assert.Equal("withdrawn", (await afterWithdraw.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().Single().GetProperty("status").GetString());

        var again = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { message = "Снова буду" }));
        Assert.Equal(HttpStatusCode.Created, again.StatusCode);
        offerId = (await again.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();

        var accepted = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);

        var denied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/start", other));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);

        var started = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/start", executor));
        Assert.Equal(HttpStatusCode.OK, started.StatusCode);
        Assert.Equal("in_progress", (await started.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("status").GetString());

        var done = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/complete", executor));
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);
        Assert.Equal("completed", (await done.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Take_Opens_Chat_For_Both()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", executor));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);
        var body = await taken.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("assigned", body.GetProperty("status").GetString());
        Assert.Equal((await GetMe(executor)).GetProperty("id").GetString(), body.GetProperty("executor_id").GetString());

        var sent = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/messages", owner, new { body = "Где встретимся?" }));
        Assert.Equal(HttpStatusCode.Created, sent.StatusCode);
        var list = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/messages", executor));
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        var rows = (await list.Content.ReadFromJsonAsync<JsonElement>(Json))
            .EnumerateArray()
            .Select(r => r.GetProperty("body").GetString())
            .ToList();
        Assert.Contains("Где встретимся?", rows);
        Assert.Contains(rows, text => text != null && text.Contains("взялся"));
    }

    [Fact]
    public async Task Matches_Nearby_Ranks_Skill()
    {
        var owner = await RegisterAsync();
        var near = await RegisterExecutorAsync();
        var far = await RegisterExecutorAsync();
        var stranger = await RegisterAsync();
        var nearId = (await GetMe(near)).GetProperty("id").GetString();
        var farId = (await GetMe(far)).GetProperty("id").GetString();
        await _client.SendAsync(Authed(HttpMethod.Patch, "/api/v1/users/me", near, new { skills = "errand" }));
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/on", near, new { latitude = 53.9023, longitude = 27.5619 }))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/on", far, new { latitude = 53.915, longitude = 27.575 }))).StatusCode);

        var created = await CreateRequest(owner, 53.9023, 27.5619, "Подбор рядом");
        var requestId = created.GetProperty("id").GetGuid();
        var forbidden = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/matches", stranger));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);

        var matches = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/matches", owner));
        Assert.Equal(HttpStatusCode.OK, matches.StatusCode);
        var rows = (await matches.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().ToList();
        var nearRow = rows.Single(r => r.GetProperty("user_id").GetString() == nearId);
        var farRow = rows.Single(r => r.GetProperty("user_id").GetString() == farId);
        Assert.True(nearRow.GetProperty("skill_match").GetBoolean());
        Assert.True(nearRow.GetProperty("score").GetInt32() >= farRow.GetProperty("score").GetInt32());
        Assert.True(nearRow.TryGetProperty("variant", out _));
        if (nearRow.GetProperty("variant").GetString() == "ranked")
        {
            Assert.True(rows.Count(r => r.GetProperty("recommended").GetBoolean()) <= 3);
            Assert.Contains(rows, r => r.GetProperty("recommended").GetBoolean());
        }
        else
        {
            Assert.DoesNotContain(rows, r => r.GetProperty("recommended").GetBoolean());
        }

        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/off", near));
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/off", far));
    }

    [Fact]
    public async Task Matches_Click_And_Impression_Dedupe()
    {
        var owner = await RegisterAsync();
        var near = await RegisterExecutorAsync();
        var stranger = await RegisterAsync();
        var nearId = Guid.Parse((await GetMe(near)).GetProperty("id").GetString()!);
        await _client.SendAsync(Authed(HttpMethod.Patch, "/api/v1/users/me", near, new { skills = "errand" }));
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/on", near, new { latitude = 53.9023, longitude = 27.5619 }))).StatusCode);

        var created = await CreateRequest(owner, 53.9023, 27.5619, "Клик по подбору");
        var requestId = created.GetProperty("id").GetGuid();
        var first = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/matches", owner));
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var second = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/matches", owner));
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var impressions = await db.MatchEvents.CountAsync(e => e.HelpRequestId == requestId && e.Kind == "impression");
            Assert.Equal(1, impressions);
        }

        var forbidden = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/matches/{nearId}/click", stranger));
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        var clicked = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/matches/{nearId}/click", owner));
        Assert.Equal(HttpStatusCode.NoContent, clicked.StatusCode);

        var analyst = await RegisterAsync();
        await GrantRoleAsync(analyst, UserRole.Analyst);
        var overview = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/analyst/overview?days=7", analyst));
        Assert.Equal(HttpStatusCode.OK, overview.StatusCode);
        var ctr = (await overview.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("match_ctr");
        Assert.True(ctr.GetProperty("ranked_impressions").GetInt32() + ctr.GetProperty("random_impressions").GetInt32() >= 1);
        Assert.True(ctr.GetProperty("ranked_clicks").GetInt32() + ctr.GetProperty("random_clicks").GetInt32() >= 1);

        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/off", near));
    }

    [Fact]
    public async Task Repeat_And_Nearby_Notify()
    {
        var owner = await RegisterAsync();
        var minsk = await RegisterExecutorAsync();
        var brest = await RegisterExecutorAsync();
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/on", minsk, new { latitude = 53.9023, longitude = 27.5619 }));
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/on", brest, new { latitude = 52.0976, longitude = 23.7340 }));

        var created = await CreateRequest(owner, 53.9023, 27.5619, "Колокол рядом");
        var requestId = created.GetProperty("id").GetGuid();
        Assert.Contains("request_nearby", await InboxKinds(minsk));
        Assert.DoesNotContain("request_nearby", await InboxKinds(owner));
        Assert.DoesNotContain("request_nearby", await InboxKinds(brest));

        var tooEarly = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/repeat", owner));
        Assert.Equal(HttpStatusCode.Conflict, tooEarly.StatusCode);

        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", minsk));
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/start", minsk));
        var done = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/complete", minsk));
        Assert.Equal(HttpStatusCode.OK, done.StatusCode);

        var repeated = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/repeat", owner));
        Assert.Equal(HttpStatusCode.Created, repeated.StatusCode);
        var copy = await repeated.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("errand", copy.GetProperty("category").GetString());
        Assert.Equal("open", copy.GetProperty("status").GetString());
        Assert.NotEqual(requestId.ToString(), copy.GetProperty("id").GetString());

        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/off", minsk));
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/shift/off", brest));
    }

    [Fact]
    public async Task Take_Second_Executor_Conflict()
    {
        var owner = await RegisterAsync();
        var first = await RegisterExecutorAsync();
        var second = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", first));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);
        var denied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", second));
        Assert.Equal(HttpStatusCode.Conflict, denied.StatusCode);
        var request = await _client.GetAsync($"/api/v1/requests/{requestId}");
        var body = await request.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("assigned", body.GetProperty("status").GetString());
        Assert.Equal((await GetMe(first)).GetProperty("id").GetString(), body.GetProperty("executor_id").GetString());
    }

    [Fact]
    public async Task Take_Paid_Without_Funds()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Платная заявка", 40);
        var requestId = created.GetProperty("id").GetGuid();

        var denied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", executor));
        Assert.Equal(HttpStatusCode.Conflict, denied.StatusCode);
        var detail = await denied.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("У клиента недостаточно средств", detail.GetProperty("detail").GetString());

        var request = await _client.GetAsync($"/api/v1/requests/{requestId}");
        var body = await request.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("open", body.GetProperty("status").GetString());
        Assert.True(body.GetProperty("executor_id").ValueKind is JsonValueKind.Null or JsonValueKind.Undefined);
    }

    [Fact]
    public async Task Mine_Includes_Taken_For_Executor()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", executor));

        var mine = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/requests?mine=true", executor));
        Assert.Equal(HttpStatusCode.OK, mine.StatusCode);
        var rows = (await mine.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().ToList();
        Assert.Contains(rows, r => r.GetProperty("id").GetGuid() == requestId);
    }

    [Fact]
    public async Task Refuse_Reopens_And_Next_Take_Ok()
    {
        var owner = await RegisterAsync();
        var first = await RegisterExecutorAsync();
        var second = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", first));

        var refused = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/refuse", first));
        Assert.Equal(HttpStatusCode.OK, refused.StatusCode);
        Assert.Equal("open", (await refused.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("status").GetString());

        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", second));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);
        var body = await taken.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("assigned", body.GetProperty("status").GetString());
        Assert.Equal((await GetMe(second)).GetProperty("id").GetString(), body.GetProperty("executor_id").GetString());
    }

    [Fact]
    public async Task Take_Pushes_Request_Updated()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();

        await using var ownerHub = ConnectHub(owner);
        var updated = new TaskCompletionSource<JsonElement>(TaskCreationOptions.RunContinuationsAsynchronously);
        ownerHub.On<JsonElement>("request_updated", dto => updated.TrySetResult(dto));
        await ownerHub.StartAsync();

        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", executor));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);

        var dto = await updated.Task.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.Equal("assigned", dto.GetProperty("status").GetString());
        Assert.Equal(requestId, dto.GetProperty("id").GetGuid());
    }

    [Fact]
    public async Task Volunteer_Cannot_Take_Paid()
    {
        var owner = await RegisterAsync();
        var paid = await CreateRequest(owner, 53.9100, 27.5500, "Платная заявка", 20);
        var volunteer = await RegisterAsync(asVolunteer: true);
        var denied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{paid.GetProperty("id").GetGuid()}/take", volunteer));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
    }

    [Fact]
    public async Task Eta_Starts_Work_And_Sets_Timer()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/wallet/topup", owner, new { amount = 20 }));
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Еду через 10", 10);
        var requestId = created.GetProperty("id").GetGuid();
        var offer = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/offers", executor, new { }));
        var offerId = (await offer.Content.ReadFromJsonAsync<JsonElement>(Json)).GetProperty("id").GetGuid();
        await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/offers/{offerId}/accept", owner));

        var eta = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/eta", executor, new { minutes = 10 }));
        Assert.Equal(HttpStatusCode.OK, eta.StatusCode);
        var body = await eta.Content.ReadFromJsonAsync<JsonElement>(Json);
        Assert.Equal("in_progress", body.GetProperty("status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("eta_at").GetString()));
    }

    [Fact]
    public async Task Client_Max_Three_Active()
    {
        var token = await RegisterAsync();
        await CreateRequest(token, 53.90, 27.56, "Первая заявка");
        await CreateRequest(token, 53.91, 27.55, "Вторая заявка");
        await CreateRequest(token, 53.89, 27.54, "Третья заявка");
        var fourth = await _client.SendAsync(Authed(HttpMethod.Post, "/api/v1/requests", token, new
        {
            title = "Четвёртая заявка",
            description = "Забрать пакет у метро и принести домой.",
            category = "errand",
            latitude = 53.9,
            longitude = 27.56,
        }));
        Assert.Equal(HttpStatusCode.Conflict, fourth.StatusCode);
    }

    [Fact]
    public async Task Volunteer_Sees_Only_Free_And_Cannot_Offer_Paid()
    {
        var owner = await RegisterAsync();
        var free = await CreateRequest(owner, 53.9023, 27.5619, "Дарма для волонтёра");
        var paid = await CreateRequest(owner, 53.9100, 27.5500, "Платная заявка", 20);
        var volunteer = await RegisterAsync(asVolunteer: true);
        await MarkVerifiedAsync(volunteer);

        var feed = await _client.SendAsync(Authed(HttpMethod.Get, "/api/v1/requests", volunteer));
        Assert.Equal(HttpStatusCode.OK, feed.StatusCode);
        var rows = (await feed.Content.ReadFromJsonAsync<JsonElement>(Json)).EnumerateArray().ToList();
        Assert.Contains(rows, r => r.GetProperty("id").GetGuid() == free.GetProperty("id").GetGuid());
        Assert.DoesNotContain(rows, r => r.GetProperty("id").GetGuid() == paid.GetProperty("id").GetGuid());

        var denied = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{paid.GetProperty("id").GetGuid()}/offers", volunteer));
        Assert.Equal(HttpStatusCode.Forbidden, denied.StatusCode);
        var ok = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{free.GetProperty("id").GetGuid()}/offers", volunteer));
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
    }

    [Fact]
    public async Task Track_Stranger_Forbidden_Owner_Sees_Ping()
    {
        var owner = await RegisterAsync();
        var executor = await RegisterExecutorAsync();
        var stranger = await RegisterAsync();
        var created = await CreateRequest(owner, 53.9023, 27.5619, "Нужна помощь рядом");
        var requestId = created.GetProperty("id").GetGuid();
        var taken = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/take", executor));
        Assert.Equal(HttpStatusCode.OK, taken.StatusCode);

        var ping = await _client.SendAsync(Authed(HttpMethod.Post, $"/api/v1/requests/{requestId}/location", executor, new
        {
            latitude = 53.91,
            longitude = 27.56,
        }));
        Assert.Equal(HttpStatusCode.OK, ping.StatusCode);

        var asOwner = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/location", owner));
        Assert.Equal(HttpStatusCode.OK, asOwner.StatusCode);

        var asStranger = await _client.SendAsync(Authed(HttpMethod.Get, $"/api/v1/requests/{requestId}/location", stranger));
        Assert.Equal(HttpStatusCode.Forbidden, asStranger.StatusCode);
    }
}

