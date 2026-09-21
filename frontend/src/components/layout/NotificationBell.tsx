import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { listNotifications, readAllNotifications, readNotification } from "../../api/notifications";
import { goToNotification } from "../../lib/inbox";
import { notificationKindLabel } from "../../lib/labels";
import { useAuthStore } from "../../store/authStore";
import type { InboxNotification } from "../../types";
import { Button } from "../ui/Button";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString("ru-BY", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function NotificationBell() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
  const readOne = useMutation({
    mutationFn: readNotification,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const readAll = useMutation({
    mutationFn: readAllNotifications,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (!user) {
    return null;
  }

  const unread = query.data?.unread_count ?? 0;
  const items = query.data?.items ?? [];

  function openItem(row: InboxNotification) {
    setOpen(false);
    goToNotification(navigate, row, (id) => readOne.mutate(id));
  }

  return (
    <div ref={root} className="relative shrink-0">
      <Button
        variant="ghost"
        className="relative shrink-0 px-3"
        aria-label={unread > 0 ? `Уведомления, непрочитанных ${unread}` : "Уведомления"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 top-full z-50 mt-1 w-[min(20rem,calc(100vw-2rem))] border border-border bg-background shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Уведомления</p>
            <span className="flex items-center gap-3">
              {unread > 0 ? (
                <button
                  type="button"
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                  onClick={() => readAll.mutate()}
                  disabled={readAll.isPending}
                >
                  Прочитать все
                </button>
              ) : null}
              <Link
                to="/inbox"
                className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary"
                onClick={() => setOpen(false)}
              >
                Все
              </Link>
            </span>
          </div>
          {items.length === 0 ? (
            <p className="px-3 py-6 text-sm text-muted-foreground">Пока тихо.</p>
          ) : (
            <ul className="scroll-volt max-h-80 overflow-y-auto">
              {items.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-start gap-2 px-3 py-3 text-left hover:bg-white/5"
                    onClick={() => openItem(row)}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.read_at ? "bg-zinc-700" : "bg-primary"}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {notificationKindLabel(row.kind)} · {formatWhen(row.created_at)}
                      </span>
                      <span className="mt-1 block text-sm font-medium">{row.title}</span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">{row.body}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
