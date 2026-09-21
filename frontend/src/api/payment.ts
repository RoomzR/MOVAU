import type { HelpRequest, Payment, ScanPreview } from "../types";
import { apiFetch } from "./client";

export function getPayment(requestId: string) {
  return apiFetch<Payment>(`/api/v1/requests/${requestId}/payment`);
}

export function payRequest(requestId: string) {
  return apiFetch<Payment>(`/api/v1/requests/${requestId}/pay`, { method: "POST" });
}

export function getScanPreview(code: string) {
  return apiFetch<ScanPreview>(`/api/v1/payments/scan/${encodeURIComponent(code)}`);
}

export function claimScan(code: string) {
  return apiFetch<HelpRequest>("/api/v1/payments/claim", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
