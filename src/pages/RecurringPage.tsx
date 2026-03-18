import { useEffect, useState } from "react";
import { recurringApi, cardsApi, categoriesApi } from "@/services/api";
import type { RecurringPurchase, Card, Category } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import ConfirmModal from "@/components/ConfirmModal";
import GlassInput from "@/components/GlassInput";
import GlassDropdown from "@/components/GlassDropdown";
import { useToast } from "@/components/Toast";
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  PlayCircle,
} from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function RecurringPage() {
  const [items, setItems] = useState<RecurringPurchase[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringPurchase | null>(null);
  const { showSuccess, showError } = useToast();

  const [form, setForm] = useState({
    card_id: "",
    category_id: "",
    description: "",
    amount: "",
    day_of_month: "1",
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [inserting, setInserting] = useState<number | null>(null);
  const [insertingAll, setInsertingAll] = useState(false);

  const load = async () => {
    try {
      const [r, c, cat] = await Promise.all([
        recurringApi.list(),
        cardsApi.list(),
        categoriesApi.list(),
      ]);
      setItems(r);
      setCards(c);
      setCategories(cat);
    } catch {
      showError("Erro ao carregar compras recorrentes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      card_id: cards[0]?.id?.toString() || "",
      category_id: "",
      description: "",
      amount: "",
      day_of_month: "1",
    });
    setModalOpen(true);
  };

  const openEdit = (item: RecurringPurchase) => {
    setEditing(item);
    setForm({
      card_id: String(item.card_id),
      category_id: item.category_id ? String(item.category_id) : "",
      description: item.description,
      amount: String(item.amount),
      day_of_month: String(item.day_of_month),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        card_id: parseInt(form.card_id),
        category_id: form.category_id ? parseInt(form.category_id) : null,
        description: form.description,
        amount: parseFloat(form.amount),
        day_of_month: parseInt(form.day_of_month),
      };

      if (editing) {
        await recurringApi.update(editing.id, data);
        showSuccess("Compra recorrente atualizada!");
      } else {
        await recurringApi.create(data);
        showSuccess("Compra recorrente criada!");
      }

      setModalOpen(false);
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await recurringApi.delete(deleteConfirm);
      showSuccess("Compra recorrente excluída!");
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleInsert = async (id: number) => {
    setInserting(id);
    try {
      await recurringApi.insert(id);
      showSuccess("Compra inserida nas transações do mês!");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setInserting(null);
    }
  };

  const handleInsertAll = async () => {
    setInsertingAll(true);
    try {
      const result = await recurringApi.insertAll();
      showSuccess(result.message);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setInsertingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
            Compras Recorrentes
          </h1>
          <p className="text-gray-400 mt-1">
            Cadastre compras que se repetem todo mês
          </p>
        </div>
        <div className="flex gap-3">
          <GlassButton variant="secondary" onClick={handleInsertAll} loading={insertingAll} className="!text-white">
            <PlayCircle className="w-4 h-4" />
            Inserir Todas
          </GlassButton>
          <GlassButton onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova Recorrente
          </GlassButton>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <RefreshCw className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma compra recorrente cadastrada</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-widest">
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-left">Cartão</th>
                  <th className="p-4 text-left">Categoria</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Dia</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-sm text-white">{item.description}</td>
                    <td className="p-4 text-sm text-white/80">
                      {item.card_name} ({item.bank_name})
                    </td>
                    <td className="p-4">
                      {item.category_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: item.category_color || "#6b7280",
                            }}
                          />
                          {item.category_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-right font-semibold text-white">
                      {formatBRL(item.amount)}
                    </td>
                    <td className="p-4 text-sm text-center text-gray-400">
                      Dia {item.day_of_month}
                    </td>
                    <td className="p-4 text-center">
                      {item.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full bg-gray-500/20 text-gray-400">
                          <XCircle className="w-3 h-3" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleInsert(item.id)}
                          disabled={inserting === item.id}
                          title="Inserir no mês atual"
                          className="p-1.5 rounded text-emerald-500 hover:bg-emerald-500/10 transition-colors border border-transparent hover:border-emerald-500/20 disabled:opacity-50"
                        >
                          {inserting === item.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin inline-block" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          title="Editar"
                          className="p-1.5 rounded text-[#007bff] hover:bg-[#007bff]/10 transition-colors border border-transparent hover:border-[#007bff]/20"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          title="Excluir"
                          className="p-1.5 rounded text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <GlassModal
        title={editing ? "Editar Compra Recorrente" : "Nova Compra Recorrente"}
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
          id="rec-description"
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <GlassDropdown
          id="rec-card"
          label="Cartão"
          options={[
            { value: "", label: "Selecione um cartão" },
            ...cards.map((c) => ({
              value: c.id,
              label: `${c.name} (${c.bank_name})`,
            })),
          ]}
          value={form.card_id}
          onChange={(val) => setForm({ ...form, card_id: val })}
        />

        <GlassDropdown
          id="rec-category"
          label="Categoria"
          options={[
            { value: "", label: "Sem categoria" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          value={form.category_id}
          onChange={(val) => setForm({ ...form, category_id: val })}
        />

        <GlassInput
          id="rec-amount"
          label="Valor"
          type="number"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />

        <GlassInput
          id="rec-day"
          label="Dia do Mês"
          type="number"
          min={1}
          max={31}
          value={form.day_of_month}
          onChange={(e) => setForm({ ...form, day_of_month: e.target.value })}
          required
        />
      </GlassModal>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Excluir Compra Recorrente"
        message="Tem certeza que deseja excluir esta compra recorrente?"
      />
    </div>
  );
}
