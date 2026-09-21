import type { User } from "../types";
import { apiFetch } from "./client";

export function sendPhoneCode(phone: string) {
  return apiFetch<{ code: string }>("/api/v1/phone/send", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
}

export function confirmPhoneCode(code: string) {
  return apiFetch<User>("/api/v1/phone/confirm", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
