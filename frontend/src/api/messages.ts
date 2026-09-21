import type { ChatMessage } from "../types";
import { apiFetch } from "./client";

/* HTTP-чат заявки: список и отправка */

export function listMessages(requestId: string) {
  return apiFetch<ChatMessage[]>(`/api/v1/requests/${requestId}/messages`);
}

export function sendMessage(requestId: string, body: string, image?: string) {
  return apiFetch<ChatMessage>(`/api/v1/requests/${requestId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body, image }),
  });
}
