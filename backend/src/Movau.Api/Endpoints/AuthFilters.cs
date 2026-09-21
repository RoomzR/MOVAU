using Movau.Api.Domain;

namespace Movau.Api.Endpoints;

public static class AuthEndpointExtensions
{
    public static RouteHandlerBuilder RequireUser(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            if (context.HttpContext.Items["user"] is not User)
            {
                return Results.Json(new { detail = "Нужна авторизация" }, statusCode: 401);
            }
            return await next(context);
        });

    public static RouteGroupBuilder RequireUser(this RouteGroupBuilder builder) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            if (context.HttpContext.Items["user"] is not User)
            {
                return Results.Json(new { detail = "Нужна авторизация" }, statusCode: 401);
            }
            return await next(context);
        });

    public static RouteGroupBuilder RequireStaff(this RouteGroupBuilder builder) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            if (context.HttpContext.Items["user"] is not User user)
            {
                return Results.Json(new { detail = "Нужна авторизация" }, statusCode: 401);
            }
            if (!user.Roles.Any(r => r.Role is UserRole.Admin or UserRole.Moderator))
            {
                return Results.Json(new { detail = "Недостаточно прав" }, statusCode: 403);
            }
            return await next(context);
        });

    public static RouteHandlerBuilder RequireAdmin(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            if (context.HttpContext.Items["user"] is not User user)
            {
                return Results.Json(new { detail = "Нужна авторизация" }, statusCode: 401);
            }
            if (!user.Roles.Any(r => r.Role == UserRole.Admin))
            {
                return Results.Json(new { detail = "Недостаточно прав" }, statusCode: 403);
            }
            return await next(context);
        });

    public static RouteHandlerBuilder RequireAnalyst(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            if (context.HttpContext.Items["user"] is not User user)
            {
                return Results.Json(new { detail = "Нужна авторизация" }, statusCode: 401);
            }
            if (!user.Roles.Any(r => r.Role is UserRole.Analyst or UserRole.Admin))
            {
                return Results.Json(new { detail = "Недостаточно прав" }, statusCode: 403);
            }
            return await next(context);
        });
}

