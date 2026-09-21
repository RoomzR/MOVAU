import type { InboxNotification, NotificationList } from "../types";
import { apiFetch } from "./client";

export function listNotifications(unread = false) {
  const suffix = unread ? "?unread=true" : "";
  return apiFetch<NotificationList>(`/api/v1/notifications${suffix}`);
}

export function readNotification(id: string) {
  return apiFetch<NotificationList>(`/api/v1/notifications/${id}/read`, { method: "POST" });
}

export function readAllNotifications() {
  return apiFetch<NotificationList>("/api/v1/notifications/read-all", { method: "POST" });
}

export type { InboxNotification };
