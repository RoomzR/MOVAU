using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Movau.Api.Data;
using Movau.Api.Domain;
using Npgsql;
using StackExchange.Redis;

namespace Movau.Api.Infrastructure;

public static class MovauHosting
{
    public static void AddMovauPlatform(this WebApplicationBuilder builder, Settings settings, bool withSignalR)
    {
        builder.Services.AddSingleton(settings);
        builder.Services.AddSingleton<JwtService>();
        builder.Services.AddHttpContextAccessor();
        builder.Services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
        });
        if (withSignalR)
        {
            builder.Services.AddSignalR().AddJsonProtocol(options =>
            {
                options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
                options.PayloadSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.SnakeCaseLower));
            });
        }

        var dataSourceBuilder = new NpgsqlDataSourceBuilder(settings.NpgsqlConnection);
        dataSourceBuilder.UseNetTopologySuite();
        dataSourceBuilder.MapEnum<UserRole>("user_role");
        dataSourceBuilder.MapEnum<HelpRequestStatus>("help_request_status");
        dataSourceBuilder.MapEnum<OfferStatus>("offer_status");
        dataSourceBuilder.MapEnum<DisputeStatus>("dispute_status");
        dataSourceBuilder.MapEnum<WalletHoldStatus>("wallet_hold_status");
        dataSourceBuilder.MapEnum<WalletTxnKind>("wallet_txn_kind");
        dataSourceBuilder.MapEnum<IdentityStatus>("identity_status");
        dataSourceBuilder.MapEnum<IdentityDocumentKind>("identity_document_kind");
        dataSourceBuilder.MapEnum<NotificationKind>("notification_kind");
        dataSourceBuilder.MapEnum<AdminEventKind>("admin_event_kind");
        var dataSource = dataSourceBuilder.Build();
        builder.Services.AddSingleton(dataSource);
        builder.Services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(dataSource, npgsql => npgsql.UseNetTopologySuite()));

        var redis = ConnectionMultiplexer.Connect(Settings.ParseRedis(settings.RedisUrl));
        builder.Services.AddSingleton<IConnectionMultiplexer>(redis);
        builder.Services.AddSingleton<ShiftStore>();
        builder.Services.AddSingleton<TrackStore>();
        builder.Services.AddSingleton<IConnectionReady>(new RedisReady(redis));
        builder.Services.AddHttpClient("osrm", client =>
        {
            client.Timeout = TimeSpan.FromMilliseconds(1500);
        });
        builder.Services.AddCors(options =>
            options.AddDefaultPolicy(policy =>
                policy.WithOrigins(settings.CorsOriginList).AllowAnyHeader().AllowAnyMethod().AllowCredentials()));
        builder.Services.AddScoped(sp =>
        {
            var http = sp.GetRequiredService<IHttpContextAccessor>().HttpContext;
            return http?.Items["user"] as User
                ?? throw new AppException(401, "Нужна авторизация");
        });
    }

    public static void UseMovauPipeline(this WebApplication app)
    {
        app.UseCors();
        app.Use(async (context, next) =>
        {
            var header = context.Request.Headers.Authorization.ToString();
            string? token = null;
            if (header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                token = header["Bearer ".Length..].Trim();
            }
            else if (context.Request.Path.StartsWithSegments("/hubs")
                     && context.Request.Query.TryGetValue("access_token", out var queryToken))
            {
                token = queryToken.ToString();
            }
            if (!string.IsNullOrEmpty(token))
            {
                try
                {
                    var jwt = context.RequestServices.GetRequiredService<JwtService>();
                    var userId = jwt.Decode(token, "access");
                    var db = context.RequestServices.GetRequiredService<AppDbContext>();
                    var user = await db.Users.AsNoTracking().Include(u => u.Roles).FirstOrDefaultAsync(u => u.Id == userId && u.IsActive);
                    if (user is not null)
                    {
                        context.Items["user"] = user;
                    }
                }
                catch
                {
                    /* гость или битый токен */
                }
            }
            await next();
        });
        app.Use(async (context, next) =>
        {
            try
            {
                await next();
            }
            catch (AppException ex)
            {
                context.Response.StatusCode = ex.Status;
                await context.Response.WriteAsJsonAsync(
                    new { detail = ex.Message },
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
            }
            catch (BadHttpRequestException ex)
            {
                context.Response.StatusCode = 400;
                await context.Response.WriteAsJsonAsync(
                    new { detail = "Некорректное тело запроса" },
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
                _ = ex;
            }
            catch (Exception ex)
            {
                context.Response.StatusCode = 500;
                await context.Response.WriteAsJsonAsync(
                    new { detail = ex.InnerException?.Message ?? ex.Message },
                    new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower });
            }
        });
    }
}
