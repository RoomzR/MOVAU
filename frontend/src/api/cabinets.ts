import type { AnalystOverview, AdminPage, BusinessStats, HelpRequest, HelpRequestPayload } from "../types";
import { apiFetch } from "./client";

export function fetchBusinessMe() {
  return apiFetch<BusinessStats>("/api/v1/business/me");
}

export function fetchBusinessRequests(query: { q?: string; status?: string; limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams();
  if (query.q) {
    params.set("q", query.q);
  }
  if (query.status) {
    params.set("status", query.status);
  }
  params.set("limit", String(query.limit ?? 25));
  params.set("offset", String(query.offset ?? 0));
  return apiFetch<AdminPage<HelpRequest>>(`/api/v1/business/requests?${params.toString()}`);
}

export function createBusinessBatch(items: HelpRequestPayload[]) {
  return apiFetch<HelpRequest[]>("/api/v1/business/requests", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function fetchAnalystOverview(days = 7) {
  return apiFetch<AnalystOverview>(`/api/v1/analyst/overview?days=${days}`);
}
