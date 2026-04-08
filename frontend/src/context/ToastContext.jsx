import { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";

/**
 * Two-context split so that components which only emit toasts
 * (success/error/warning/info) get a stable reference and don't
 * re-render every time the toast list changes. Only ToastContainer
 * subscribes to the list itself.
 */
const ToastActionsContext = createContext(null);
const ToastListContext = createContext(null);

let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type, message) => {
      const id = ++toastIdCounter;

      setToasts((prev) => {
        const next = [...prev, { id, type, message, createdAt: Date.now() }];
        // Max 3 toasts — drop oldest
        if (next.length > 3) {
          const removed = next.shift();
          clearTimeout(timersRef.current[removed.id]);
          delete timersRef.current[removed.id];
        }
        return next;
      });

      // Auto-dismiss after 4s
      timersRef.current[id] = setTimeout(() => removeToast(id), 4000);

      return id;
    },
    [removeToast]
  );

  // Stable across re-renders: addToast/removeToast are useCallback-bound
  // and only depend on each other, so this object is built once.
  const actions = useMemo(
    () => ({
      removeToast,
      success: (msg) => addToast("success", msg),
      error: (msg) => addToast("error", msg),
      warning: (msg) => addToast("warning", msg),
      info: (msg) => addToast("info", msg),
    }),
    [addToast, removeToast]
  );

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastListContext.Provider value={toasts}>
        {children}
      </ToastListContext.Provider>
    </ToastActionsContext.Provider>
  );
}

/**
 * Returns the stable toast actions object. Safe to use as a hook
 * dependency — it only changes if the provider itself remounts.
 */
export function useToast() {
  const ctx = useContext(ToastActionsContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/**
 * Returns the live toast list. Use this only where you actually need
 * to render the toasts (i.e. ToastContainer); it changes on every push.
 */
export function useToastList() {
  const ctx = useContext(ToastListContext);
  if (ctx === null || ctx === undefined) {
    throw new Error("useToastList must be used within ToastProvider");
  }
  return ctx;
}
