import type { InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function GlassInput({
  label,
  id,
  className = "",
  ...props
}: GlassInputProps) {
  return (
    <div className={`glass-input-group ${className}`}>
      <input id={id} placeholder=" " {...props} />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
