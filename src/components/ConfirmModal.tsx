import type { ReactNode } from "react";
import GlassModal from "./GlassModal";
import GlassButton from "./GlassButton";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string | ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  confirmVariant = "danger",
  loading = false,
}: ConfirmModalProps) {
  return (
    <GlassModal
      title={title}
      isOpen={isOpen}
      onClose={onClose}
      footer={
        <>
          <GlassButton variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </GlassButton>
          <GlassButton variant={confirmVariant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </GlassButton>
        </>
      }
    >
      <p className="text-white/80">{message}</p>
    </GlassModal>
  );
}
