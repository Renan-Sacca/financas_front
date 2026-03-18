import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface GlassDropdownProps {
  label: string;
  id?: string;
  options: { value: string | number; label: string }[];
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function GlassDropdown({
  label,
  id,
  options,
  value,
  onChange,
  placeholder = "Selecione",
  className = "",
}: GlassDropdownProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 260);
    }
    setOpen(!open);
  };

  const selected = options.find((o) => String(o.value) === String(value));
  const hasValue = !!selected;

  return (
    <div ref={ref} className={`glass-input-group ${className}`}>
      <button
        type="button"
        ref={btnRef}
        id={id}
        onClick={handleToggle}
        className="w-full flex items-center justify-between cursor-pointer"
        style={{
          padding: "40px 16px 12px",
          background: "rgba(255, 255, 255, 0.05)",
          border: "none",
          borderBottom: open ? "2px solid #007bff" : "2px solid rgba(255, 255, 255, 0.15)",
          borderRadius: "4px 4px 0 0",
          outline: "none",
        }}
      >
        <span className={hasValue ? "text-white text-base" : "text-transparent text-base"}>
          {hasValue ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-white/50 ${open ? "rotate-180" : ""}`} />
      </button>
      <label
        style={{
          position: "absolute",
          left: "16px",
          top: hasValue || open ? "10px" : "30px",
          fontSize: hasValue || open ? "0.75rem" : "1rem",
          color: hasValue || open ? "#007bff" : "rgba(255, 255, 255, 0.5)",
          pointerEvents: "none",
        }}
      >
        {label}
      </label>
      {open && (
        <div
          style={{
            position: "absolute",
            ...(openUp
              ? { bottom: "100%", marginBottom: "4px" }
              : { top: "100%", marginTop: "4px" }),
            left: 0,
            right: 0,
            background: "#0d1b2a",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "8px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
            zIndex: 50,
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-white/50 text-sm text-center">Nenhuma opção</div>
          ) : (
            options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(String(opt.value));
                  setOpen(false);
                }}
                style={{
                  padding: "12px 16px",
                  fontSize: "14px",
                  cursor: "pointer",
                  background: String(opt.value) === String(value) ? "#007bff" : "transparent",
                  color: "white",
                }}
                onMouseEnter={(e) => {
                  if (String(opt.value) !== String(value)) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (String(opt.value) !== String(value)) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
