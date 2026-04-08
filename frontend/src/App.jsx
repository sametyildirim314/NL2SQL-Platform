import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import LandingPage from "./components/landing/LandingPage";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import SmoothScroll from "./components/shared/SmoothScroll";
import CursorFollower from "./components/shared/CursorFollower";
import ToastContainer from "./components/shared/ToastContainer";
import RequireAuth from "./components/auth/RequireAuth";
import { DatabaseProvider } from "./context/DatabaseContext";
import { QueryProvider } from "./context/QueryContext";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import WorkspacePage from "./components/workspace/WorkspacePage";
import DatabasesPage from "./components/databases/DatabasesPage";
import DatabaseSchemaPage from "./components/databases/DatabaseSchemaPage";
import HistoryPanel from "./components/history/HistoryPanel";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (location.state?.scrollToQuery) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.state]);

  // Workspace-style routes use a fixed-layout shell, no public Navbar/Footer/SmoothScroll
  const isAppShell =
    location.pathname.startsWith("/workspace") ||
    location.pathname.startsWith("/databases");

  if (isAppShell) {
    return (
      <DatabaseProvider>
        <QueryProvider>
          <ToastContainer />
          <Routes>
            <Route
              element={
                <RequireAuth>
                  <WorkspaceLayout />
                </RequireAuth>
              }
            >
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/workspace/history" element={<HistoryPanel />} />
              <Route path="/databases" element={<DatabasesPage />} />
              <Route path="/databases/:dbId/schema" element={<DatabaseSchemaPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/workspace" replace />} />
          </Routes>
        </QueryProvider>
      </DatabaseProvider>
    );
  }

  return (
    <DatabaseProvider>
      <ToastContainer />
      <SmoothScroll>
        <div className="min-h-screen bg-white">
          <CursorFollower />
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/query" element={<Navigate to="/workspace" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      </SmoothScroll>
    </DatabaseProvider>
  );
}
