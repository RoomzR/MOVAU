import type { TokenPair, User } from "../types";
import { apiFetch } from "./client";

export function register(payload: {
  email: string;
  password: string;
  display_name: string;
  as_executor?: boolean;
  as_volunteer?: boolean;
}) {
  return apiFetch<TokenPair>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function login(payload: { email: string; password: string }) {
  return apiFetch<TokenPair>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function fetchMe() {
  return apiFetch<User>("/api/v1/auth/me");
}
