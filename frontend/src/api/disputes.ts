import type { AdminPage, Dispute } from "../types";
import { apiFetch } from "./client";

export function listDisputes(requestId: string) {
  return apiFetch<Dispute[]>(`/api/v1/requests/${requestId}/disputes`);
}

export function createDispute(requestId: string, reason: string) {
  return apiFetch<Dispute>(`/api/v1/requests/${requestId}/disputes`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function adminListDisputes(query: { q?: string; status?: "open" | "resolved"; limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  params.set("limit", String(query.limit ?? 25));
  params.set("offset", String(query.offset ?? 0));
  return apiFetch<AdminPage<Dispute>>(`/api/v1/admin/disputes?${params.toString()}`);
}

export function adminResolveDispute(id: string, resolution: string) {
  return apiFetch<Dispute>(`/api/v1/admin/disputes/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify({ resolution }),
  });
}
