import { useQuery } from "@tanstack/react-query";
import { BarChart3, Briefcase, Heart, ListChecks, LogOut, MapPin, Radio, ScanLine, Shield, Wallet } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { getWallet } from "../../api/wallet";
import { requestHomeTop } from "../../lib/homeDeck";
import { formatMoney } from "../../lib/labels";
import { useAuthStore } from "../../store/authStore";
import { useShiftStore } from "../../store/shiftStore";
import { Button } from "../ui/Button";
import { Container } from "./Container";
import { NotificationBell } from "./NotificationBell";

function navClass(isActive: boolean) {
  return `inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-[0.14em] ${
    isActive ? "bg-primary text-on-primary" : "text-foreground hover:text-primary"
  }`;
}

export function AppHeader() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const onShift = useShiftStore((state) => state.onShift);
  const pending = useShiftStore((state) => state.pending);
  const error = useShiftStore((state) => state.error);
  const start = useShiftStore((state) => state.start);
  const stop = useShiftStore((state) => state.stop);
  const resetShift = useShiftStore((state) => state.reset);
  const home = useLocation().pathname === "/";
  const isExecutor = Boolean(user?.roles.includes("executor"));
  const canScan = Boolean(isExecutor || user?.roles.includes("volunteer"));
  const isStaff = Boolean(user?.roles.includes("admin") || user?.roles.includes("moderator"));
  const isBusiness = Boolean(user?.roles.includes("business") || user?.roles.includes("admin"));
  const isAnalyst = Boolean(user?.roles.includes("analyst") || user?.roles.includes("admin"));
  const walletQuery = useQuery({
    queryKey: ["wallet", "me"],
    queryFn: getWallet,
    enabled: Boolean(user),
  });

  async function handleLogout() {
    if (isExecutor && onShift) {
      await stop();
    }
    resetShift();
    logout();
  }

  return (
    <header className="sticky top-0 z-30 h-[var(--header-h)] border-b border-zinc-800 bg-background/90 backdrop-blur-md">
      <Container className="flex h-full items-center gap-3">
        <Link
          to="/"
          className="flex min-h-11 shrink-0 cursor-pointer items-center gap-3"
          aria-label="На главную"
          onClick={() => {
            if (home) {
              requestHomeTop();
            }
          }}
        >
          <img src="/logo.png" alt="MOVAŬ" className="h-7 w-auto" />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:inline">
            Мова дапамогі
          </span>
        </Link>
        <div className="ml-auto flex min-w-0 items-center gap-1">
          <nav className="flex min-w-0 flex-nowrap items-center justify-end gap-1 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <NavLink to="/requests" end className={({ isActive }) => navClass(isActive)}>
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            Заявки
          </NavLink>
          {user ? (
            <NavLink to="/requests/mine" className={({ isActive }) => navClass(isActive)} aria-label="В работе">
              <ListChecks className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">В работе</span>
            </NavLink>
          ) : null}
          {canScan ? (
            <NavLink to="/scan" className={({ isActive }) => navClass(isActive)} aria-label="Скан">
              <ScanLine className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden md:inline">Скан</span>
            </NavLink>
          ) : null}
          <NavLink to="/heroes" className={({ isActive }) => navClass(isActive)} aria-label="Герои">
            <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="hidden md:inline">Герои</span>
          </NavLink>
          {isExecutor ? (
            <Button
              variant="ghost"
              aria-pressed={onShift}
              aria-label={onShift ? "Выйти со смены" : "Выйти на смену"}
              title={error ?? (onShift ? "Выйти со смены" : "Выйти на смену")}
              disabled={pending}
              onClick={() => void (onShift ? stop() : start())}
              className={
                onShift
                  ? "shrink-0 border-secondary bg-secondary text-foreground hover:border-secondary hover:text-foreground"
                  : "shrink-0"
              }
            >
              <Radio className="h-4 w-4 shrink-0 md:mr-2" aria-hidden="true" />
              <span className="hidden md:inline">На смене</span>
            </Button>
          ) : null}
          {isExecutor && user?.identity_status !== "verified" ? (
            <Link
              to="/me/verify"
              className="hidden min-h-11 shrink-0 items-center px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-primary sm:inline-flex"
            >
              Паспорт
            </Link>
          ) : null}
          {error && isExecutor ? (
            <span className="max-w-[11rem] shrink-0 text-[11px] leading-tight text-destructive" role="alert">
              {error}
            </span>
          ) : null}
          {isBusiness ? (
            <NavLink to="/business" className={({ isActive }) => `${navClass(isActive)} hidden lg:inline-flex`}>
              <Briefcase className="h-4 w-4 shrink-0" aria-hidden="true" />
              Бизнес
            </NavLink>
          ) : null}
          {isAnalyst ? (
            <NavLink to="/analyst" className={({ isActive }) => `${navClass(isActive)} hidden lg:inline-flex`}>
              <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Аналитика
            </NavLink>
          ) : null}
          {isStaff ? (
            <NavLink to="/admin" className={({ isActive }) => navClass(isActive)} aria-label="Админ">
              <Shield className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden lg:inline">Админ</span>
            </NavLink>
          ) : null}
          </nav>
          <div className="flex shrink-0 items-center gap-1">
          {user ? (
            <>
              <NotificationBell />
              <Link
                to="/me"
                className="inline-flex min-h-11 shrink-0 items-center gap-2 px-2 text-xs font-semibold text-muted-foreground hover:text-primary"
                title="Профиль и кошелёк"
              >
                <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{formatMoney(walletQuery.data?.balance)} BYN</span>
                <span className="hidden max-w-36 truncate lg:inline">{user.display_name}</span>
              </Link>
              <Button variant="ghost" className="shrink-0" onClick={handleLogout} aria-label="Выйти">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden min-h-11 shrink-0 cursor-pointer items-center px-3 text-xs font-semibold uppercase tracking-[0.14em] sm:inline-flex"
              >
                Войти
              </Link>
              <Link to="/register" className="shrink-0">
                <Button variant="accent">Начать</Button>
              </Link>
            </>
          )}
        </div>
        </div>
      </Container>
    </header>
  );
}
