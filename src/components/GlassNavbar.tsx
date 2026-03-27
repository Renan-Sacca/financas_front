import { Link, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Building2,
  Receipt,
  Wallet,
  UserCircle,
  LogOut,
  Menu,
  X,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { getNavbarOpacityClass } from "./navbarUtils";

const navLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/banks", label: "Bancos", icon: Building2 },
  { to: "/transactions", label: "Trans. Cartão", icon: Receipt },
  { to: "/deposits", label: "Trans. Bancárias", icon: Wallet },
];

export default function GlassNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Fecha dropdown ao mudar de rota
  useEffect(() => { setProfileOpen(false); }, [location.pathname]);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!profileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        profileBtnRef.current && !profileBtnRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  // Calcula posição do dropdown quando abre
  const toggleProfile = useCallback(() => {
    setProfileOpen(prev => {
      if (!prev && profileBtnRef.current) {
        const rect = profileBtnRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        });
      }
      return !prev;
    });
  }, []);

  const firstName = user?.full_name?.split(" ")[0] ?? "";

  return (
    <nav
      className="fixed w-full z-[60] top-0 py-4 px-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="max-w-7xl mx-auto">
        <div
          className={`glass-panel rounded-full px-6 py-3 flex items-center justify-between transition-opacity duration-150 ${getNavbarOpacityClass(isScrolled, isHovered)}`}
        >
          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2">
            <span className="font-heading font-bold text-xl tracking-tighter text-white">FINANÇAS</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#29C5F6] to-[#3a4b9f] flex items-center justify-center shadow-[0_4px_10px_rgba(41,197,246,0.3)] group-hover:scale-105 transition-transform duration-75">
              <Wallet className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link key={link.to} to={link.to}
                  className={`flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest transition-colors duration-75 ${isActive ? "text-white" : "text-white/50 hover:text-white"}`}>
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Profile button + Logout */}
          <div className="hidden lg:flex items-center gap-3">
            {user && (
              <button
                ref={profileBtnRef}
                onClick={toggleProfile}
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <UserCircle className="w-4 h-4" />
                <span className="tracking-wider uppercase">{firstName}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${profileOpen ? "rotate-180" : ""}`} />
              </button>
            )}
            <button onClick={logout}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-red-400 transition-colors uppercase tracking-widest cursor-pointer">
              <LogOut className="w-3.5 h-3.5" />
              Sair
            </button>
          </div>

          {/* Mobile Toggle */}
          <button className="lg:hidden text-white cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="lg:hidden mt-2 glass-panel rounded-2xl p-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? "bg-[#007bff]/20 text-white" : "text-white/60 hover:text-white hover:bg-white/5"}`}>
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-white/10 pt-2 mt-2 flex flex-col gap-1">
              <Link to="/profile" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
                <UserCircle className="w-4 h-4" />
                Perfil
              </Link>
              <Link to="/pending" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all">
                <ClipboardList className="w-4 h-4" />
                Extratos Pendentes
              </Link>
              <button onClick={() => { setMobileOpen(false); logout(); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400/70 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer">
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Dropdown - renderizado via Portal fora da navbar */}
      {profileOpen && createPortal(
        <div
          ref={dropdownRef}
          className="w-48 rounded-xl py-1 shadow-xl border border-white/10"
          style={{
            position: "fixed",
            top: dropdownPos.top,
            right: dropdownPos.right,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(32px) saturate(200%)",
            WebkitBackdropFilter: "blur(32px) saturate(200%)",
          }}
        >
          <Link to="/profile"
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <UserCircle className="w-3.5 h-3.5" />
            Perfil
          </Link>
          <Link to="/pending"
            className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-white/70 hover:text-white hover:bg-white/5 transition-colors">
            <ClipboardList className="w-3.5 h-3.5" />
            Extratos Pendentes
          </Link>
        </div>,
        document.body
      )}
    </nav>
  );
}
