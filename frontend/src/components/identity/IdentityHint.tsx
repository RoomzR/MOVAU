import { Link } from "react-router-dom";

import { ApiError } from "../../api/client";

export function needsIdentity(error: unknown) {
  return error instanceof ApiError && error.message.includes("личность");
}

export function IdentityHint({ error }: { error: unknown }) {
  if (!needsIdentity(error)) {
    return null;
  }
  return (
    <p className="text-sm text-muted-foreground">
      Платные и дарма — после проверки паспорта.{" "}
      <Link className="font-semibold text-primary" to="/me/verify">
        Подтвердить личность
      </Link>
    </p>
  );
}
