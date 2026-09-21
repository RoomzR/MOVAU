import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "./components/layout/AppShell";
import { AdminPage } from "./pages/AdminPage";
import { AdminDisputesPage } from "./pages/admin/AdminDisputesPage";
import { AdminIdentityPage } from "./pages/admin/AdminIdentityPage";
import { AdminJournalPage } from "./pages/admin/AdminJournalPage";
import { AdminOverviewPage } from "./pages/admin/AdminOverviewPage";
import { AdminRequestsPage } from "./pages/admin/AdminRequestsPage";
import { AdminUserDetailPage } from "./pages/admin/AdminUserDetailPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AnalystPage } from "./pages/AnalystPage";
import { BusinessPage } from "./pages/BusinessPage";
import { HeroesPage } from "./pages/HeroesPage";
import { HomePage } from "./pages/HomePage";
import { IdentityVerifyPage } from "./pages/IdentityVerifyPage";
import { InboxPage } from "./pages/InboxPage";
import { LoginPage } from "./pages/LoginPage";
import { MyRequestsPage } from "./pages/MyRequestsPage";
import { ProfileMePage } from "./pages/ProfileMePage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { RequestCreatePage } from "./pages/RequestCreatePage";
import { RequestDetailPage } from "./pages/RequestDetailPage";
import { ScanPage } from "./pages/ScanPage";
import { SitePage } from "./pages/SitePage";
import { useAuthStore } from "./store/authStore";
import { useShiftStore } from "./store/shiftStore";

const RequestsPage = lazy(async () => {
  const mod = await import("./pages/RequestsPage");
  return { default: mod.RequestsPage };
});

export default function App() {
  const loadMe = useAuthStore((state) => state.loadMe);
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    void (async () => {
      await loadMe();
      const current = useAuthStore.getState().user;
      if (current?.roles.includes("executor")) {
        await useShiftStore.getState().hydrate();
      } else {
        useShiftStore.getState().reset();
      }
    })();
  }, [accessToken, loadMe]);

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/me" element={<ProfileMePage />} />
        <Route path="/me/verify" element={<IdentityVerifyPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/users/:id" element={<ProfilePage />} />
        <Route
          path="/requests"
          element={
            <Suspense fallback={<div className="min-h-screen bg-background" />}>
              <RequestsPage />
            </Suspense>
          }
        />
        <Route path="/requests/new" element={<RequestCreatePage />} />
        <Route path="/requests/mine" element={<MyRequestsPage />} />
        <Route path="/requests/:id" element={<RequestDetailPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="/scan/:code" element={<ScanPage />} />
        <Route path="/heroes" element={<HeroesPage />} />
        <Route path="/about/:slug" element={<SitePage />} />
        <Route path="/business" element={<BusinessPage />} />
        <Route path="/analyst" element={<AnalystPage />} />
        <Route path="/admin" element={<AdminPage />}>
          <Route index element={<AdminOverviewPage />} />
          <Route path="identity" element={<AdminIdentityPage />} />
          <Route path="requests" element={<AdminRequestsPage />} />
          <Route path="disputes" element={<AdminDisputesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailPage />} />
          <Route path="journal" element={<AdminJournalPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
