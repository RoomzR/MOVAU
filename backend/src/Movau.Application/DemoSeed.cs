using Microsoft.EntityFrameworkCore;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Data;

public static class DemoSeed
{
    public const string Password = "movau123";

    public static async Task EnsureAsync(AppDbContext db)
    {
        if (await db.Users.AnyAsync(u => u.Email == "admin@movau.test"))
        {
            await EnsureIdentitiesAsync(db);
            await EnsurePhonesAsync(db);
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var hash = PasswordService.Hash(Password);

        var client = User("client@movau.test", "Анна Клиент", "Нужна помощь по дому.", [UserRole.Client], 200m, now, hash);
        var exec = User("exec@movau.test", "Павел Исполнитель", "Курьер и поручения.", [UserRole.Client, UserRole.Executor], 40m, now, hash, "errand,grocery,ride");
        var volunteer = User("volunteer@movau.test", "Вера Волонтёр", "Помогаю дарма.", [UserRole.Client, UserRole.Volunteer], 0m, now, hash, "grocery,pharmacy");
        var business = User("business@movau.test", "ООО Дапамога", "Пакетные задания.", [UserRole.Client, UserRole.Business], 800m, now, hash);
        var moderator = User("moderator@movau.test", "Мира Модератор", "Разбираю споры.", [UserRole.Client, UserRole.Moderator], 0m, now, hash);
        var analyst = User("analyst@movau.test", "Алекс Аналитик", "Смотрю метрики.", [UserRole.Client, UserRole.Analyst], 0m, now, hash);
        var admin = User("admin@movau.test", "Адам Админ", "Полный доступ.", [UserRole.Client, UserRole.Admin], 0m, now, hash);

        db.Users.AddRange(client, exec, volunteer, business, moderator, analyst, admin);
        db.Wallets.AddRange(
            Wallet(client.Id, 200m, now),
            Wallet(exec.Id, 40m, now),
            Wallet(volunteer.Id, 0m, now),
            Wallet(business.Id, 800m, now),
            Wallet(moderator.Id, 0m, now),
            Wallet(analyst.Id, 0m, now),
            Wallet(admin.Id, 0m, now));

        var free = Request(client.Id, "Хлеб и молоко", "Забрать в магазине у дома и донести.", "grocery", null, 53.9023, 27.5619, "Мінск, пр. Незалежнасці", now);
        var paid = Request(client.Id, "Аптека на Октябрьской", "Нужны капли, оплата на месте плюс дорога.", "pharmacy", 18m, 53.9102, 27.5531, "Мінск, вул. Кастрычніцкая", now);
        var ride = Request(client.Id, "Довезти до вокзала", "Два чемодана, к 16:00.", "ride", 25m, 53.8908, 27.5477, "Мінск, вакзал", now);
        var pack = Request(business.Id, "Развести 12 обедов", "Пакет: 12 адресов в центре, коробки готовы.", "errand", 90m, 53.9045, 27.5615, "Мінск, центр", now);
        db.HelpRequests.AddRange(free, paid, ride, pack);

        var done = Request(client.Id, "Помощь с сумками", "Уже сделано — для кармы волонтёра.", "grocery", null, 53.9001, 27.5667, "Мінск", now.AddDays(-2));
        done.Status = HelpRequestStatus.Completed;
        done.ExecutorId = volunteer.Id;
        db.HelpRequests.Add(done);
        db.Reviews.Add(new Review
        {
            HelpRequestId = done.Id,
            AuthorId = client.Id,
            SubjectId = volunteer.Id,
            Score = 5,
            Comment = "Пришла быстро, спасибо.",
            CreatedAt = now.AddDays(-1),
        });

        await db.SaveChangesAsync();
        await EnsureIdentitiesAsync(db);
        await EnsurePhonesAsync(db);
    }

    private static async Task EnsureIdentitiesAsync(AppDbContext db)
    {
        var now = DateTimeOffset.UtcNow;
        var seeds = new (string Email, string Personal, string Document, string Name)[]
        {
            ("client@movau.test", "1234567A001PB1", "MP1234567", "Анна Клиент"),
            ("exec@movau.test", "2345678B002PB2", "MP2345678", "Павел Исполнитель"),
            ("volunteer@movau.test", "4567890D004PB4", "MP4567890", "Вера Волонтёр"),
            ("business@movau.test", "3456789C003PB3", "AA3456789", "ООО Дапамога"),
        };
        foreach (var seed in seeds)
        {
            var user = await db.Users.FirstOrDefaultAsync(item => item.Email == seed.Email);
            if (user is null)
            {
                continue;
            }
            if (await db.IdentityVerifications.AnyAsync(item => item.UserId == user.Id))
            {
                continue;
            }
            db.IdentityVerifications.Add(new IdentityVerification
            {
                UserId = user.Id,
                DocumentKind = IdentityDocumentKind.PassportBy,
                FullName = seed.Name,
                PersonalNumber = seed.Personal,
                PersonalHash = IdentityOps.HashPersonal(seed.Personal),
                DocumentNumber = seed.Document,
                Status = IdentityStatus.Verified,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
        await db.SaveChangesAsync();
    }

    private static async Task EnsurePhonesAsync(AppDbContext db)
    {
        var now = DateTimeOffset.UtcNow;
        var seeds = new (string Email, string Phone)[]
        {
            ("client@movau.test", "+375291111111"),
            ("exec@movau.test", "+375292222222"),
            ("volunteer@movau.test", "+375293333333"),
            ("business@movau.test", "+375294444444"),
            ("moderator@movau.test", "+375295555555"),
            ("analyst@movau.test", "+375296666666"),
            ("admin@movau.test", "+375297777777"),
        };
        foreach (var seed in seeds)
        {
            var user = await db.Users.FirstOrDefaultAsync(item => item.Email == seed.Email);
            if (user is null || user.Phone is not null)
            {
                continue;
            }
            user.Phone = seed.Phone;
            user.PhoneVerifiedAt = now;
            user.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
    }

    private static User User(
        string email,
        string name,
        string bio,
        UserRole[] roles,
        decimal _,
        DateTimeOffset now,
        string hash,
        string? skills = null) =>
        new()
        {
            Email = email,
            HashedPassword = hash,
            DisplayName = name,
            Bio = bio,
            Skills = skills,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
            Roles = roles.Select(role => new UserRoleAssignment { Role = role }).ToList(),
        };

    private static Wallet Wallet(Guid userId, decimal balance, DateTimeOffset now) =>
        new() { UserId = userId, Balance = balance, UpdatedAt = now };

    private static HelpRequest Request(
        Guid clientId,
        string title,
        string description,
        string category,
        decimal? price,
        double lat,
        double lng,
        string address,
        DateTimeOffset now) =>
        new()
        {
            ClientId = clientId,
            Title = title,
            Description = description,
            Category = category,
            Status = HelpRequestStatus.Open,
            Location = Mapping.Point(lat, lng),
            AddressText = address,
            Price = price,
            PaymentCode = Mapping.NewPaymentCode(),
            CreatedAt = now,
            UpdatedAt = now,
        };
}
