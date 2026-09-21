namespace Movau.Api.Contracts;

public record NotificationList(List<NotificationPublic> Items, int UnreadCount);
