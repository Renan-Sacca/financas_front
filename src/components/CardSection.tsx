import { useState } from "react";
import { cardsApi } from "@/services/api";
import type { Card } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import ConfirmModal from "@/components/ConfirmModal";
import GlassInput from "@/components/GlassInput";
import GlassDropdown from "@/components/GlassDropdown";
import { useToast } from "@/components/Toast";
import { useInvalidateDashboard } from "@/hooks/useDashboardCache";
import { CreditCard, Plus, Pencil, Trash2, Banknote } from "lucide-react";

interface CardSectionProps {
  bankId: number;
  cards: Card[];
  onCardsChange: () => void;
}

export default function CardSection({ bankId, cards, onCardsChange }: CardSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "credit" as "credit" | "debit",
    limit_amount: "",
    due_day: "",
  });
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showSuccess, showError } = useToast();
  const invalidateDashboard = useInvalidateDashboard();

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      type: "credit",
      limit_amount: "",
      due_day: "",
    });
    setModalOpen(true);
  };

  const openEdit = (card: Card) => {
    setEditing(card);
    setForm({
      name: card.name,
      type: card.type,
      limit_amount: String(card.limit_amount ?? ""),
      due_day: String(card.due_day ?? ""),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        name: form.name,
        type: form.type,
        limit_amount: form.limit_amount ? parseFloat(form.limit_amount) : undefined,
        due_day: form.due_day ? parseInt(form.due_day) : undefined,
      };

      if (editing) {
        await cardsApi.update(editing.id, {
          ...data,
          bank_id: bankId,
          limit_amount: data.limit_amount ?? null,
          due_day: data.due_day ?? null,
        });
        showSuccess("Cartão atualizado!");
      } else {
        await cardsApi.create(bankId, data);
        showSuccess("Cartão criado!");
      }
      setModalOpen(false);
      invalidateDashboard();
      onCardsChange();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao salvar cartão");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await cardsApi.delete(deleteConfirm);
      showSuccess("Cartão excluído!");
      invalidateDashboard();
      onCardsChange();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao excluir");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-semibold text-white tracking-tight">
          Cartões
        </h2>
        <GlassButton onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Novo Cartão
        </GlassButton>
      </div>

      {cards.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <CreditCard className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Nenhum cartão cadastrado para este banco</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="glass-panel glass-panel-hover rounded-xl p-5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-75 ${
                    card.type === "credit"
                      ? "bg-gradient-to-br from-purple-500 to-pink-500"
                      : "bg-gradient-to-br from-emerald-500 to-teal-500"
                  }`}
                >
                  {card.type === "credit" ? (
                    <CreditCard className="w-5 h-5" />
                  ) : (
                    <Banknote className="w-5 h-5" />
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(card)}
                    className="p-2 text-white/40 hover:text-[#007bff] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="p-2 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-heading text-lg font-medium text-white tracking-tight mb-1">
                {card.name}
              </h3>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                {card.type === "credit" ? "Crédito" : "Débito"}
              </p>

              {card.type === "credit" && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Limite</span>
                    <span className="text-white font-semibold">
                      {formatBRL(card.limit_amount ?? 0)}
                    </span>
                  </div>
                  {card.due_day && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Vencimento</span>
                      <span className="text-white/70">Dia {card.due_day}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <GlassModal
        title={editing ? "Editar Cartão" : "Novo Cartão"}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <GlassButton variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </GlassButton>
            <GlassButton onClick={handleSave} loading={saving}>
              Salvar
            </GlassButton>
          </>
        }
      >
        <GlassInput
          id="card-name"
          label="Nome do Cartão"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />

        <GlassDropdown
          id="card-type"
          label="Tipo"
          options={[
            { value: "credit", label: "Crédito" },
            { value: "debit", label: "Débito" },
          ]}
          value={form.type}
          onChange={(val) => setForm({ ...form, type: val as "credit" | "debit" })}
        />

        {form.type === "credit" && (
          <>
            <GlassInput
              id="card-limit"
              label="Limite"
              type="number"
              step="0.01"
              value={form.limit_amount}
              onChange={(e) =>
                setForm({ ...form, limit_amount: e.target.value })
              }
            />
            <GlassInput
              id="card-due"
              label="Dia de Vencimento"
              type="number"
              min={1}
              max={31}
              value={form.due_day}
              onChange={(e) => setForm({ ...form, due_day: e.target.value })}
            />
          </>
        )}
      </GlassModal>

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
        loading={deleting}
        title="Excluir Cartão"
        message="Tem certeza que deseja excluir este cartão?"
      />
    </div>
  );
}
