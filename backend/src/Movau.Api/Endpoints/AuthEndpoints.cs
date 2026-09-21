using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    public static void MapAuth(this WebApplication app)
    {
        var auth = app.MapGroup("/api/v1/auth");
        auth.MapPost("/register", Register).DisableAntiforgery();
        auth.MapPost("/login", Login);
        auth.MapPost("/refresh", Refresh);
        auth.MapGet("/me", GetMe).RequireUser();
    }

    private static async Task<IResult> Register(RegisterRequest body, AppDbContext db, JwtService jwt)
    {
        if (string.IsNullOrWhiteSpace(body.Email) || body.Password is not { Length: >= 8 } || body.DisplayName is not { Length: >= 2 })
        {
            throw new AppException(400, "Некорректные данные регистрации");
        }
        var email = body.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
        {
            throw new AppException(409, "Email уже занят");
        }
        var now = DateTimeOffset.UtcNow;
        var user = new User
        {
            Email = email,
            Phone = body.Phone,
            HashedPassword = PasswordService.Hash(body.Password),
            DisplayName = body.DisplayName,
            CreatedAt = now,
            UpdatedAt = now,
        };
        user.Roles.Add(new UserRoleAssignment { Role = UserRole.Client });
        if (body.AsExecutor)
        {
            user.Roles.Add(new UserRoleAssignment { Role = UserRole.Executor });
        }
        if (body.AsVolunteer)
        {
            user.Roles.Add(new UserRoleAssignment { Role = UserRole.Volunteer });
        }
        db.Users.Add(user);
        db.Wallets.Add(new Wallet { UserId = user.Id, Balance = 0, UpdatedAt = now });
        await db.SaveChangesAsync();
        return Results.Json(Tokens(jwt, user.Id), statusCode: 201);
    }

    private static async Task<IResult> Login(LoginRequest body, AppDbContext db, JwtService jwt)
    {
        var user = await db.Users.Include(u => u.Roles)
            .FirstOrDefaultAsync(u => u.Email == body.Email.Trim().ToLowerInvariant());
        if (user is null || !PasswordService.Verify(body.Password, user.HashedPassword))
        {
            throw new AppException(401, "Неверный email или пароль");
        }
        if (!user.IsActive)
        {
            throw new AppException(401, "Аккаунт отключён");
        }
        return Results.Json(Tokens(jwt, user.Id));
    }

    private static async Task<IResult> Refresh(RefreshRequest body, AppDbContext db, JwtService jwt)
    {
        Guid userId;
        try
        {
            userId = jwt.Decode(body.RefreshToken, "refresh");
        }
        catch
        {
            throw new AppException(401, "Недействительный refresh");
        }
        var user = await db.Users.FindAsync(userId);
        if (user is null || !user.IsActive)
        {
            throw new AppException(401, "Пользователь не найден");
        }
        return Results.Json(Tokens(jwt, user.Id));
    }

    private static TokenPair Tokens(JwtService jwt, Guid userId) =>
        new(jwt.Create(userId, "access"), jwt.Create(userId, "refresh"));
}

