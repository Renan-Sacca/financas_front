import { useEffect, useState } from "react";
import { transactionsApi, cardsApi, banksApi, categoriesApi } from "@/services/api";
import type { Transaction, Card, Bank, Category } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import GlassInput from "@/components/GlassInput";
import { useToast } from "@/components/Toast";
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  Check,
  Clock,
  Filter,
  CheckCheck,
} from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { showSuccess, showError } = useToast();

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterBank, setFilterBank] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Form
  const [form, setForm] = useState({
    card_id: "",
    amount: "",
    installments: "1",
    category_id: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [c, b, cat] = await Promise.all([
        cardsApi.list(),
        banksApi.list(),
        categoriesApi.list(),
      ]);
      setCards(c);
      setBanks(b);
      setCategories(cat);

      const params: Record<string, string> = {};
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (filterBank) params.bank_id = filterBank;
      if (filterStatus) params.status = filterStatus;

      setTransactions(await transactionsApi.list(params));
    } catch {
      showError("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => {
    setLoading(true);
    load();
  };

  const clearFilters = () => {
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterBank("");
    setFilterStatus("");
    setLoading(true);
    setTimeout(load, 0);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      card_id: cards[0]?.id?.toString() || "",
      amount: "",
      installments: "1",
      category_id: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setModalOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditing(t);
    setForm({
      card_id: String(t.card_id),
      amount: String(t.amount),
      installments: String(t.total_installments ?? 1),
      category_id: t.category_id ? String(t.category_id) : "",
      description: t.description,
      date: t.date,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        card_id: parseInt(form.card_id),
        amount: parseFloat(form.amount),
        type: "expense" as const,
        description: form.description,
        date: form.date,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        total_installments:
          parseInt(form.installments) > 1
            ? parseInt(form.installments)
            : undefined,
      };

      if (editing) {
        await transactionsApi.update(editing.id, data);
        showSuccess("Compra atualizada!");
      } else {
        await transactionsApi.create(data);
        showSuccess("Compra registrada!");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir esta compra?")) return;
    try {
      await transactionsApi.delete(id);
      showSuccess("Compra excluída!");
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    }
  };

  const toggleStatus = async (t: Transaction) => {
    try {
      await transactionsApi.updateStatus(t.id, !t.is_paid);
      showSuccess(t.is_paid ? "Marcada como pendente" : "Marcada como paga");
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === transactions.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(transactions.map((t) => t.id)));
    }
  };

  const bulkUpdateStatus = async (isPaid: boolean) => {
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          transactionsApi.updateStatus(id, isPaid),
        ),
      );
      showSuccess(
        `${selected.size} transações ${isPaid ? "pagas" : "pendentes"}`,
      );
      setSelected(new Set());
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    }
  };

  const markPreviousAsPaid = async () => {
    try {
      const result = await transactionsApi.markPreviousAsPaid();
      showSuccess(`${result.updated} compras marcadas como pagas`);
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    }
  };

  const creditCards = cards.filter((c) => c.type === "credit");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
            Compras
          </h1>
          <p className="text-gray-400 mt-1">Gerencie suas transações</p>
        </div>
        <div className="flex gap-3">
          <GlassButton variant="secondary" size="sm" onClick={markPreviousAsPaid}>
            <CheckCheck className="w-4 h-4" />
            Pagar Anteriores
          </GlassButton>
          <GlassButton onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova Compra
          </GlassButton>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            placeholder="Data Inicial"
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#007bff]"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            placeholder="Data Final"
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#007bff]"
          />
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#007bff]"
          >
            <option value="">Todos os bancos</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#007bff]"
          >
            <option value="">Todos os status</option>
            <option value="paid">Pago</option>
            <option value="pending">Pendente</option>
          </select>
          <GlassButton size="sm" onClick={applyFilters}>
            Aplicar
          </GlassButton>
          <GlassButton size="sm" variant="secondary" onClick={clearFilters}>
            Limpar
          </GlassButton>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="glass-panel rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm text-white/70">
            {selected.size} transações selecionadas
          </span>
          <div className="flex gap-2">
            <GlassButton size="sm" onClick={() => bulkUpdateStatus(true)}>
              Marcar Pagas
            </GlassButton>
            <GlassButton
              size="sm"
              variant="secondary"
              onClick={() => bulkUpdateStatus(false)}
            >
              Marcar Pendentes
            </GlassButton>
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Limpar
            </GlassButton>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhuma compra encontrada</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-widest">
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === transactions.length}
                      onChange={toggleSelectAll}
                      className="accent-[#007bff]"
                    />
                  </th>
                  <th className="p-4 text-left">Data</th>
                  <th className="p-4 text-left">Cartão</th>
                  <th className="p-4 text-left">Categoria</th>
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Parcela</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selected.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="accent-[#007bff]"
                      />
                    </td>
                    <td className="p-4 text-sm text-white/70">
                      {formatDate(t.date)}
                    </td>
                    <td className="p-4 text-sm text-white/80">
                      {t.card_name || `#${t.card_id}`}
                    </td>
                    <td className="p-4">
                      {t.category_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: t.category_color || "#6b7280",
                            }}
                          />
                          {t.category_name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-white">{t.description}</td>
                    <td className="p-4 text-sm text-right font-semibold text-white">
                      {formatBRL(t.amount)}
                    </td>
                    <td className="p-4 text-xs text-center text-gray-400">
                      {t.total_installments && t.total_installments > 1
                        ? `${t.current_installment}/${t.total_installments}`
                        : "—"}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleStatus(t)}
                        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-semibold px-2.5 py-1 rounded-full transition-all ${
                          t.is_paid
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {t.is_paid ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                        {t.is_paid ? "Pago" : "Pendente"}
                      </button>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(t)}
                          className="p-1.5 text-white/30 hover:text-[#007bff] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-white/30 hover:text-red-400 transition-colors"
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

      {/* Modal */}
      <GlassModal
        title={editing ? "Editar Compra" : "Nova Compra"}
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
        <div className="glass-input-group">
          <select
            id="tx-card"
            value={form.card_id}
            onChange={(e) => setForm({ ...form, card_id: e.target.value })}
          >
            <option value="">Selecione um cartão</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.bank_name})
              </option>
            ))}
          </select>
          <label htmlFor="tx-card">Cartão</label>
        </div>

        <GlassInput
          id="tx-amount"
          label="Valor Total"
          type="number"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />

        {creditCards.some((c) => String(c.id) === form.card_id) && (
          <GlassInput
            id="tx-installments"
            label="Parcelas"
            type="number"
            min={1}
            max={60}
            value={form.installments}
            onChange={(e) =>
              setForm({ ...form, installments: e.target.value })
            }
          />
        )}

        <div className="glass-input-group">
          <select
            id="tx-category"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            <option value="">Sem categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label htmlFor="tx-category">Categoria</label>
        </div>

        <GlassInput
          id="tx-description"
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />

        <GlassInput
          id="tx-date"
          label="Data da Compra"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
      </GlassModal>
    </div>
  );
}
