import type { NavigateFunction } from "react-router-dom";

import type { InboxNotification } from "../types";

export function notificationHref(row: InboxNotification) {
  const href = row.href?.trim() || "/inbox";
  return href.startsWith("/") ? href : `/${href}`;
}

export function goToNotification(
  navigate: NavigateFunction,
  row: InboxNotification,
  markRead?: (id: string) => void,
) {
  navigate(notificationHref(row));
  if (!row.read_at) {
    markRead?.(row.id);
  }
}
