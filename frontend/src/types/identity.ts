import type { IdentityStatus } from "./user";

export type IdentityDocumentKind = "passport_by" | "id_card_by" | "other";

export type IdentityMe = {
  status: IdentityStatus;
  document_kind: IdentityDocumentKind | null;
  full_name: string | null;
  personal_masked: string | null;
  document_number: string | null;
  reject_reason: string | null;
  has_document: boolean;
  has_selfie: boolean;
};

export type AdminIdentity = {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  document_kind: IdentityDocumentKind;
  full_name: string;
  personal_number: string;
  document_number: string;
  status: IdentityStatus;
  reject_reason: string | null;
  created_at: string;
  has_document: boolean;
  has_selfie: boolean;
  reviewed_at?: string | null;
};
