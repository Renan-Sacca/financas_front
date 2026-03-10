import type { ButtonHTMLAttributes, ReactNode } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  loading?: boolean;
}

export default function GlassButton({
  variant = "primary",
  size = "md",
  children,
  loading,
  className = "",
  disabled,
  ...props
}: GlassButtonProps) {
  const base =
    "font-semibold uppercase tracking-widest transition-all duration-300 rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "px-4 py-2 text-[10px]",
    md: "px-6 py-3 text-xs",
    lg: "px-8 py-4 text-sm",
  };

  const variants = {
    primary:
      "bg-[#007bff] text-white shadow-lg shadow-blue-900/40 hover:bg-white hover:text-[#007bff]",
    secondary:
      "glass-panel border border-white/10 text-white/70 hover:bg-white hover:text-black hover:border-white",
    danger:
      "bg-red-500/80 text-white shadow-lg shadow-red-900/30 hover:bg-red-400",
    ghost:
      "text-white/50 hover:text-white hover:bg-white/5",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
}
