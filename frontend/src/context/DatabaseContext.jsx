import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../services/api";
import { useToast } from "./ToastContext";

const STORAGE_KEY = "selectedDbId";

const DatabaseContext = createContext(null);

export function DatabaseProvider({ children }) {
  const [databases, setDatabases] = useState([]);
  const [selectedDbId, setSelectedDbIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const toast = useToast();

  const setSelectedDbId = useCallback((dbId) => {
    setSelectedDbIdState(dbId);
    if (dbId) {
      localStorage.setItem(STORAGE_KEY, dbId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!api.isAuthenticated()) {
      setDatabases([]);
      return [];
    }
    setLoading(true);
    setLoadError(null);
    try {
      const list = await api.databases.list();
      setDatabases(list);

      // Auto-select logic: if current selection is not in list, fall back
      // to first active DB.
      const activeList = list.filter((d) => d.isActive !== false);
      const stillValid =
        selectedDbId && list.some((d) => d.dbId === selectedDbId);

      if (!stillValid) {
        const fallback = activeList[0]?.dbId || list[0]?.dbId || null;
        setSelectedDbId(fallback);
      }
      return list;
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : "Veritabanı listesi alınamadı.";
      setLoadError(msg);
      toast.error(msg);
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedDbId, setSelectedDbId, toast]);

  useEffect(() => {
    if (api.isAuthenticated()) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedDatabase = useMemo(
    () => databases.find((d) => d.dbId === selectedDbId) || null,
    [databases, selectedDbId]
  );

  const value = useMemo(
    () => ({
      databases,
      selectedDbId,
      selectedDatabase,
      setSelectedDbId,
      refresh,
      loading,
      loadError,
    }),
    [databases, selectedDbId, selectedDatabase, setSelectedDbId, refresh, loading, loadError]
  );

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export function useDatabase() {
  const ctx = useContext(DatabaseContext);
  if (!ctx) {
    throw new Error("useDatabase must be used inside <DatabaseProvider>");
  }
  return ctx;
}
