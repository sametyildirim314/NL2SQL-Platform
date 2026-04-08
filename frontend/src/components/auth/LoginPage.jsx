import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail, Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  if (api.isAuthenticated()) {
    return <Navigate to="/workspace" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("E-posta ve şifre alanları zorunludur.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.login({ email: normalizedEmail, password });
      toast.success("Giriş başarılı.");
      const targetPath = location.state?.from?.pathname || "/workspace";
      navigate(targetPath, { replace: true });
    } catch (err) {
      const errorMsg = err.message || "Giriş yapılırken bir hata oluştu.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10 bg-slate-50">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Giriş Yap</h1>
        <p className="text-sm text-slate-500 mt-2">
          NL2SQL sorgulama ekranına erişmek için hesabınızla giriş yapın.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-posta</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Mail className="w-4 h-4 text-slate-400" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 focus:outline-none"
                placeholder="ornek@mail.com"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Şifre</span>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <Lock className="w-4 h-4 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-800 focus:outline-none"
                placeholder="********"
              />
            </div>
          </label>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
              loading ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Giriş yapılıyor...
              </span>
            ) : (
              "Giriş Yap"
            )}
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Hesabın yok mu?{" "}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Kayıt Ol
          </Link>
        </p>
      </div>
    </div>
  );
}
