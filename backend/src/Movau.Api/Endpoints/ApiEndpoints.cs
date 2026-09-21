using Microsoft.EntityFrameworkCore;
using Movau.Api.Contracts;
using Movau.Api.Data;
using Movau.Api.Domain;
using Movau.Api.Infrastructure;
using Movau.Api.Services;

namespace Movau.Api.Endpoints;

public static partial class ApiEndpoints
{
    private static readonly UserRole[] SelfRoles = [UserRole.Executor, UserRole.Volunteer, UserRole.Business];
    private static readonly UserRole[] StaffGrantable =
        [UserRole.Executor, UserRole.Volunteer, UserRole.Business, UserRole.Moderator, UserRole.Analyst];
    private static readonly UserRole[] ModeratorGrantable = [UserRole.Executor, UserRole.Volunteer];
    private const int MaxActiveRequests = 3;
    private const int BusinessActiveRequests = 20;
    private static readonly HelpRequestStatus[] Cancelable =
        [HelpRequestStatus.Open, HelpRequestStatus.Assigned, HelpRequestStatus.InProgress];
    private static readonly string[] RequestCategories =
        ["errand", "pharmacy", "grocery", "ride", "home", "animals", "kids", "other"];

    public static void MapApi(this WebApplication app)
    {
        app.MapHealth();
        app.MapAuth();
        app.MapUsers();
        app.MapRequests();
        app.MapPayments();
        app.MapOffers();
        app.MapShift();
        app.MapWallet();
        app.MapAdmin();
        app.MapIdentity();
        app.MapNotifications();
        app.MapPhone();
        app.MapHeroes();
        app.MapBusiness();
        app.MapAnalyst();
    }
}

