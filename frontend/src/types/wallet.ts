import type { HoldStatus, PaymentStatus } from "./request";

export type Payment = {
  help_request_id: string;
  title: string;
  amount: number | null;
  currency: string;
  purpose: string;
  status: PaymentStatus;
  qr_payload: string | null;
  code: string | null;
  request_status: string;
};

export type ScanPreview = {
  help_request_id: string;
  title: string;
  amount: number | null;
  currency: string;
  request_status: string;
  payment_status: PaymentStatus;
  executor_id: string | null;
  claimable: boolean;
  needs_photo: boolean;
};

export type WalletHold = {
  id: string;
  help_request_id: string;
  payer_id: string;
  payee_id: string | null;
  amount: number;
  status: HoldStatus;
  created_at: string;
};

export type WalletTxn = {
  id: string;
  amount: number;
  kind: "topup" | "hold" | "release" | "refund";
  help_request_id: string | null;
  created_at: string;
};

export type WalletMe = {
  balance: number;
  updated_at: string;
  holds: WalletHold[];
  txns: WalletTxn[];
};
