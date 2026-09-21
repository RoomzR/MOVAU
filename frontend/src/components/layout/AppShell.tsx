import { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";

import { stopShiftKeepalive } from "../../api/shift";
import { useAuthStore } from "../../store/authStore";
import { useShiftStore } from "../../store/shiftStore";
import { Spotlight } from "../motion/Spotlight";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { useUserHub } from "../../lib/useUserHub";

export function AppShell() {
  const home = useLocation().pathname === "/";
  const onShift = useShiftStore((state) => state.onShift);
  const heartbeat = useShiftStore((state) => state.heartbeat);
  useUserHub();

  useEffect(() => {
    if (!onShift) {
      return;
    }
    const timer = window.setInterval(() => {
      void heartbeat();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [heartbeat, onShift]);

  useEffect(() => {
    function leaveShift() {
      const executor = useAuthStore.getState().user?.roles.includes("executor");
      if (executor && useShiftStore.getState().onShift) {
        stopShiftKeepalive();
      }
    }
    window.addEventListener("pagehide", leaveShift);
    window.addEventListener("beforeunload", leaveShift);
    return () => {
      window.removeEventListener("pagehide", leaveShift);
      window.removeEventListener("beforeunload", leaveShift);
    };
  }, []);

  return (
    <div className={`relative flex flex-col ${home ? "h-svh overflow-hidden" : "min-h-screen overflow-x-hidden"}`}>
      <Spotlight />
      <AppHeader />
      <main className={`relative z-10 flex flex-1 flex-col ${home ? "min-h-0" : ""}`}>
        <Outlet />
      </main>
      {home ? null : <AppFooter />}
    </div>
  );
}
