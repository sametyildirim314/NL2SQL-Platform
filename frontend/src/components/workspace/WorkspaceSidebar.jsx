import { NavLink, useNavigate } from "react-router-dom";
import { Database, MessageSquare, History, LogOut, Home } from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const navItems = [
  { to: "/workspace", label: "Sorgu", icon: MessageSquare, end: true },
  { to: "/databases", label: "Veritabanları", icon: Database, end: false },
  { to: "/workspace/history", label: "Geçmiş", icon: History, end: false },
];

export default function WorkspaceSidebar() {
  const navigate = useNavigate();
  const toast = useToast();
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

  const handleLogout = () => {
    api.logout();
    toast.info("Çıkış yapıldı.");
    navigate("/", { replace: true });
  };

  return (
    <aside className="relative z-10 w-60 shrink-0 bg-white/40 backdrop-blur-2xl border-r border-blue-200/60 shadow-xl shadow-blue-200/20 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-blue-200/60">
        <NavLink to="/" className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:text-blue-600 transition-colors">
          <Database className="w-5 h-5 text-blue-600" />
          NL2SQL
        </NavLink>
        {user?.fullName && (
          <p className="mt-2 text-xs text-slate-500 truncate">{user.fullName}</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-100/80 text-blue-700 shadow-sm shadow-blue-100"
                  : "text-slate-600 hover:bg-blue-50/70 hover:text-blue-700"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="px-3 py-3 border-t border-blue-200/60 space-y-1">
        <NavLink
          to="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-blue-50/70 hover:text-blue-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          Ana Sayfa
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
