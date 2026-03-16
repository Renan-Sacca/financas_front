import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Tag,
  Receipt,
  Wallet,
  UserCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/banks", label: "Bancos", icon: Building2 },
  { to: "/cards", label: "Cartões", icon: CreditCard },
  { to: "/categories", label: "Categorias", icon: Tag },
  { to: "/transactions", label: "Compras", icon: Receipt },
  { to: "/deposits", label: "Depósitos", icon: Wallet },
];

export default function GlassNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed w-full z-[60] top-0 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="glass-panel rounded-full px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2">
            <span className="font-heading font-bold text-xl tracking-tighter text-white">
              FINANÇAS
            </span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#29C5F6] to-[#3a4b9f] flex items-center justify-center shadow-[0_4px_10px_rgba(41,197,246,0.3)] group-hover:scale-105 transition-transform duration-75">
              <Wallet className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest transition-colors duration-75 ${
                    isActive
                      ? "text-white"
                      : "text-white/50 hover:text-white"
                  }`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* User + Logout */}
          <div className="hidden lg:flex items-center gap-4">
            {user && (
              <Link
                to="/profile"
                className="flex items-center gap-2 text-xs text-white/60 hover:text-white transition-colors"
              >
                <UserCircle className="w-4 h-4" />
                <span className="tracking-wider uppercase">
                  {user.full_name?.split(" ")[0]}
                </span>
              </Link>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors uppercase tracking-widest"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>

          {/* Mobile Toggle */}
          <button
            className="lg:hidden text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden mt-2 glass-panel rounded-2xl p-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#007bff]/20 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-white/10 pt-2 mt-2 flex flex-col gap-2">
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
              >
                <UserCircle className="w-4 h-4" />
                Perfil
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-white/5 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
