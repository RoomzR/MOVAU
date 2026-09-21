import type { UserRole } from "../types";

export const GRANTABLE: UserRole[] = ["executor", "volunteer", "business", "moderator", "analyst"];
export const LIST_GRANTABLE: UserRole[] = ["executor", "volunteer"];
const MODERATOR_GRANTABLE: UserRole[] = ["executor", "volunteer"];

export function canAssignRole(actorRoles: string[] | undefined, role: UserRole) {
  if (actorRoles?.includes("admin")) {
    return true;
  }
  return Boolean(actorRoles?.includes("moderator") && MODERATOR_GRANTABLE.includes(role));
}

export function actorRoleLabel(roles: string[] | undefined) {
  if (roles?.includes("admin")) {
    return "admin";
  }
  if (roles?.includes("moderator")) {
    return "модератор";
  }
  if (roles?.includes("analyst")) {
    return "аналитик";
  }
  return "сотрудник";
}
