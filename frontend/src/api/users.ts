import type { User, UserCard, UserRole } from "../types";
import { apiFetch } from "./client";

export type UserUpdate = {
  display_name?: string;
  phone?: string | null;
  bio?: string | null;
  skills?: string | null;
};

export function fetchMyProfile() {
  return apiFetch<User>("/api/v1/users/me");
}

export function updateMyProfile(payload: UserUpdate) {
  return apiFetch<User>("/api/v1/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function fetchUser(id: string) {
  return apiFetch<UserCard>(`/api/v1/users/${id}`);
}

export function addMyRole(role: UserRole) {
  return apiFetch<User>("/api/v1/users/me/roles", {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

export function removeMyRole(role: UserRole) {
  return apiFetch<User>(`/api/v1/users/me/roles/${role}`, { method: "DELETE" });
}
