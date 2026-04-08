import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { useToast, useToastList } from "../../context/ToastContext";

const TOAST_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: "bg-green-50 border-green-200",
    text: "text-green-800",
    progress: "bg-green-500",
    iconColor: "text-green-500",
  },
  error: {
    icon: XCircle,
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    progress: "bg-red-500",
    iconColor: "text-red-500",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    progress: "bg-amber-500",
    iconColor: "text-amber-500",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    progress: "bg-blue-500",
    iconColor: "text-blue-500",
  },
};

export default function ToastContainer() {
  const toasts = useToastList();
  const { removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onClose }) {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const config = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
  const Icon = config.icon;

  useEffect(() => {
    // Trigger enter animation
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setDismissing(true);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 min-w-[300px] max-w-[400px] p-4 rounded-xl border shadow-lg transition-all duration-300 ${
        config.bg
      } ${
        visible && !dismissing
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
      <p className={`flex-1 text-sm leading-relaxed ${config.text}`}>{toast.message}</p>
      <button
        onClick={handleClose}
        className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors cursor-pointer"
        aria-label="Kapat"
      >
        <X className="w-4 h-4 text-slate-400" />
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl">
        <div className={`h-full toast-progress-bar ${config.progress}`} />
      </div>
    </div>
  );
}
