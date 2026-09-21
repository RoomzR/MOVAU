import { useQuery } from "@tanstack/react-query";
import { BookText, FolderOpen, IdCard, LayoutDashboard, Scale, Users } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

import { adminOverview } from "../../api/admin";

const NAV = [
  { to: "/admin", end: true, label: "Обзор", icon: LayoutDashboard, hint: null },
  { to: "/admin/identity", end: false, label: "Личность", icon: IdCard, hint: "pending_identity" as const },
  { to: "/admin/requests", end: false, label: "Заявки", icon: FolderOpen, hint: "open_requests" as const },
  { to: "/admin/disputes", end: false, label: "Споры", icon: Scale, hint: "open_disputes" as const },
  { to: "/admin/users", end: false, label: "Люди", icon: Users, hint: null },
  { to: "/admin/journal", end: false, label: "Журнал", icon: BookText, hint: null },
];

function navClass(active: boolean) {
  return `group relative inline-flex min-h-11 shrink-0 items-center gap-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] ${
    active ? "bg-primary text-on-primary" : "text-foreground hover:text-primary"
  }`;
}

export function AdminShell() {
  const overview = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: adminOverview,
  });
  const counts = overview.data;

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <nav
        className="flex gap-1 overflow-x-auto border-b border-border md:w-52 md:shrink-0 md:flex-col md:overflow-x-hidden md:border-b-0 md:border-r"
        aria-label="Разделы админки"
      >
        {NAV.map((item) => {
          const Icon = item.icon;
          const count = item.hint && counts ? counts[item.hint] : 0;
          const marked = Boolean(item.hint && count > 0);
          return (
            <NavLink key={item.to} to={item.to} end={item.end} aria-label={item.label} className={({ isActive }) => navClass(isActive)}>
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">{item.label}</span>
              {marked ? (
                <span
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary group-aria-[current=page]:bg-on-primary md:right-3"
                  aria-hidden="true"
                />
              ) : null}
            </NavLink>
          );
        })}
      </nav>
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
