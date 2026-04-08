import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import Features from "./Features";
import Stats from "./Stats";
import QueryInterface from "../query/QueryInterface";
import FAQ from "./FAQ";

export default function LandingPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const shouldFocusQuery = location.state?.scrollToQuery === true;

    if (!shouldFocusQuery) return;

    const timer = window.setTimeout(() => {
      const queryEl = document.getElementById("query");
      if (!queryEl) return;

      const headerOffset = 72;
      const queryTop = queryEl.getBoundingClientRect().top + window.scrollY;
      const targetTop = Math.max(0, queryTop - headerOffset);
      window.scrollTo({ top: targetTop, left: 0, behavior: "auto" });
    }, 80);

    if (location.state?.scrollToQuery) {
      navigate(location.pathname, { replace: true, state: {} });
    }

    return () => window.clearTimeout(timer);
  }, [location.pathname, location.state, navigate]);

  return (
    <>
      <Hero />
      <QueryInterface />
      <HowItWorks />
      <Features />
      <Stats />
      <FAQ />
    </>
  );
}