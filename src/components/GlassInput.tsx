import type { InputHTMLAttributes } from "react";

interface GlassInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export default function GlassInput({
  label,
  id,
  className = "",
  placeholder: _placeholder,
  ...props
}: GlassInputProps) {
  return (
    <div className={`glass-input-group ${className}`}>
      <input id={id} {...props} placeholder=" " />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
