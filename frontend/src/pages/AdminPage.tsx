import { Navigate } from "react-router-dom";

import { AdminShell } from "../components/admin/AdminShell";
import { useAuthStore } from "../store/authStore";

export function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isStaff = Boolean(user?.roles.includes("admin") || user?.roles.includes("moderator"));

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AdminShell />
    </div>
  );
}
