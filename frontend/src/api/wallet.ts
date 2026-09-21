import type { WalletMe } from "../types";
import { apiFetch } from "./client";

export function getWallet() {
  return apiFetch<WalletMe>("/api/v1/wallet/me");
}

export function topupWallet(amount: number) {
  return apiFetch<WalletMe>("/api/v1/wallet/topup", {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}
