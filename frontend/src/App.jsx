import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import LandingPage from "./components/landing/LandingPage";
import LoginPage from "./components/auth/LogionPage";
import RegisterPage from "./components/auth/Register";
import SmoothScroll from "./components/shared/SmoothScroll";
import CursorFollower from "./components/shared/CursorFollower";
import ToastContainer from "./components/shared/ToastContainer";

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

  return (
    <>
      <ToastContainer />
      <SmoothScroll>
        <div className="min-h-screen bg-white">
          <CursorFollower />
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/query" element={<LandingPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Footer />
        </div>
      </SmoothScroll>
    </>
  );
}