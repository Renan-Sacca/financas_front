import type { SelectHTMLAttributes } from "react";

interface GlassSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string | number; label: string }[];
}

export default function GlassSelect({
  label,
  id,
  options,
  className = "",
  ...props
}: GlassSelectProps) {
  return (
    <div className={`glass-input-group ${className}`}>
      <select id={id} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
