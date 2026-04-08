import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Database } from "lucide-react";
import { api } from "../../services/api";

const navLinks = [
  { label: "Nasıl Çalışır", href: "#how-it-works" },
  { label: "Özellikler", href: "#features" },
  { label: "İstatistikler", href: "#stats" },
  { label: "SSS", href: "#faq" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = api.isAuthenticated();

  const handleNavClick = (e, href) => {
    if (location.pathname !== "/") {
      e.preventDefault();
      navigate("/" + href);
    }
    setMobileOpen(false);
  };

  const handleQueryAction = (e) => {
    e.preventDefault();
    if (api.isAuthenticated()) {
      navigate("/workspace");
    } else {
      navigate("/login");
    }
    setMobileOpen(false);
  };

  const handleLoginAction = (e) => {
    e.preventDefault();
    navigate("/login");
    setMobileOpen(false);
  };

  const handleRegisterAction = (e) => {
    e.preventDefault();
    navigate("/register");
    setMobileOpen(false);
  };

  const handleLogoutAction = (e) => {
    e.preventDefault();
    api.logout();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate("/"); }}
            className="flex items-center gap-2 text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors"
          >
            <Database className="w-6 h-6 text-blue-600" />
            NL2SQL
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                {link.label}
              </a>
            ))}
            {!isAuthenticated ? (
              <>
                <a
                  href="/login"
                  onClick={handleLoginAction}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-lg"
                >
                  Giriş Yap
                </a>
                <a
                  href="/register"
                  onClick={handleRegisterAction}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-lg"
                >
                  Kayıt Ol
                </a>
              </>
            ) : (
              <>
                <a
                  href="/workspace"
                  onClick={handleQueryAction}
                  className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all hover:shadow-lg"
                >
                  Sorgu Yap
                </a>
                <a
                  href="/"
                  onClick={handleLogoutAction}
                  className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
                >
                  Çıkış Yap
                </a>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 transition-colors"
            aria-label="Menüyü aç/kapat"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 border-t border-slate-200">
            <div className="flex flex-col gap-3 pt-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="text-base font-medium text-slate-600 hover:text-blue-600 transition-colors px-2"
                >
                  {link.label}
                </a>
              ))}
              {!isAuthenticated ? (
                <>
                  <a
                    href="/login"
                    onClick={handleLoginAction}
                    className="mx-2 mt-2 px-5 py-2.5 rounded-full text-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
                  >
                    Giriş Yap
                  </a>
                  <a
                    href="/register"
                    onClick={handleRegisterAction}
                    className="mx-2 mt-2 px-5 py-2.5 rounded-full text-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
                  >
                    Kayıt Ol
                  </a>
                </>
              ) : (
                <>
                  <a
                    href="/#query"
                    onClick={handleQueryAction}
                    className="mx-2 mt-2 px-5 py-2.5 rounded-full text-center text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
                  >
                    Sorgu Yap
                  </a>
                  <a
                    href="/"
                    onClick={handleLogoutAction}
                    className="text-base font-medium text-slate-600 hover:text-blue-600 transition-colors px-2"
                  >
                    Çıkış Yap
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
