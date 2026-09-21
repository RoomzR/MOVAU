import type {
  AdminEvent,
  AdminOverview,
  AdminPage,
  AdminRequest,
  AdminUser,
  AdminUserDetail,
  HelpRequest,
  HelpRequestStatus,
  UserRole,
} from "../types";
import { apiFetch } from "./client";

export type AdminListQuery = {
  q?: string;
  status?: string;
  category?: string;
  is_active?: boolean;
  role?: UserRole;
  limit?: number;
  offset?: number;
};

function listParams(query: AdminListQuery) {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.category) {
    params.set("category", query.category);
  }
  if (query.is_active != null) {
    params.set("is_active", String(query.is_active));
  }
  if (query.role) {
    params.set("role", query.role);
  }
  params.set("limit", String(query.limit ?? 25));
  params.set("offset", String(query.offset ?? 0));
  return params;
}

export function adminOverview() {
  return apiFetch<AdminOverview>("/api/v1/admin/overview");
}

export function adminListRequests(query: AdminListQuery = {}) {
  return apiFetch<AdminPage<AdminRequest>>(`/api/v1/admin/requests?${listParams(query).toString()}`);
}

export function adminListUsers(query: AdminListQuery = {}) {
  return apiFetch<AdminPage<AdminUser>>(`/api/v1/admin/users?${listParams(query).toString()}`);
}

export function adminGetUser(id: string) {
  return apiFetch<AdminUserDetail>(`/api/v1/admin/users/${id}`);
}

export function adminCancelRequest(id: string) {
  return apiFetch<HelpRequest>(`/api/v1/admin/requests/${id}/cancel`, { method: "POST" });
}

export function adminDeactivateUser(id: string) {
  return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/deactivate`, { method: "POST" });
}

export function adminActivateUser(id: string) {
  return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/activate`, { method: "POST" });
}

export function adminGrantRole(id: string, role: UserRole) {
  return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/roles`, {
    method: "POST",
    body: JSON.stringify({ role }),
  });
}

export function adminRevokeRole(id: string, role: UserRole) {
  return apiFetch<AdminUser>(`/api/v1/admin/users/${id}/roles/${role}`, { method: "DELETE" });
}

export function adminListEvents(query: AdminListQuery = {}) {
  return apiFetch<AdminPage<AdminEvent>>(`/api/v1/admin/events?${listParams(query).toString()}`);
}

export type { HelpRequestStatus };
