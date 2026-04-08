import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DatabaseSelector from "./DatabaseSelector";
import QueryInterface from "../query/QueryInterface";

/**
 * Main workspace landing page. Sticky top bar with DatabaseSelector
 * over a full-height QueryInterface.
 *
 * Supports an optional `presetQuery` from router state (used by HistoryPanel
 * "rerun" action).
 */
export default function WorkspacePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [presetQuery, setPresetQuery] = useState("");

  useEffect(() => {
    const incoming = location.state?.presetQuery;
    if (typeof incoming === "string" && incoming.length > 0) {
      setPresetQuery(incoming);
      // Clear the state so a refresh doesn't keep applying it
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Top bar */}
      <div className="px-6 py-3 border-b border-blue-200/60 bg-white/40 backdrop-blur-2xl flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-blue-500/80 mr-1">
          Veritabanı
        </span>
        <DatabaseSelector />
      </div>

      <QueryInterface initialQuery={presetQuery} />
    </div>
  );
}
