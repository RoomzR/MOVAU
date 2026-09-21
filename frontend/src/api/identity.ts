import type { AdminIdentity, AdminPage, IdentityDocumentKind, IdentityMe, IdentityStatus } from "../types";
import { apiFetch } from "./client";

export function getMyIdentity() {
  return apiFetch<IdentityMe>("/api/v1/identity/me");
}

export function submitIdentity(payload: {
  document_kind: IdentityDocumentKind;
  full_name: string;
  personal_number: string;
  document_number: string;
  document: string;
  selfie: string;
}) {
  return apiFetch<IdentityMe>("/api/v1/identity/me", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminListIdentity(query: { status?: IdentityStatus; q?: string; limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams();
  params.set("status", query.status ?? "pending");
  if (query.q) {
    params.set("q", query.q);
  }
  params.set("limit", String(query.limit ?? 25));
  params.set("offset", String(query.offset ?? 0));
  return apiFetch<AdminPage<AdminIdentity>>(`/api/v1/admin/identity?${params.toString()}`);
}

export function adminReviewIdentity(id: string, decision: "verified" | "rejected", reason?: string) {
  return apiFetch<AdminIdentity>(`/api/v1/admin/identity/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ decision, reason }),
  });
}
