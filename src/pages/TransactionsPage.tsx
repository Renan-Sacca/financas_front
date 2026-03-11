import { useEffect, useState } from "react";
import { transactionsApi, cardsApi, banksApi, categoriesApi } from "@/services/api";
import type { Transaction, Card, Bank, Category } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import ConfirmModal from "@/components/ConfirmModal";
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
  Link,
  Layers,
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
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id?: number; groupId?: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    setEditingGroup(null);
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
    setEditingGroup(null);
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
      const parsedInstallments = parseInt(form.installments) || 1;
      const selectedCard = cards.find((c) => String(c.id) === form.card_id);
      const isCredit = selectedCard?.type === "credit";
      
      if (editingGroup) {
        const data = {
          group_id: editingGroup,
          card_id: parseInt(form.card_id),
          total_amount: parseFloat(form.amount),
          description: form.description,
          date: form.date,
          category_id: form.category_id ? parseInt(form.category_id) : null,
          installments: parsedInstallments,
        };
        await transactionsApi.updateGroup(data);
        showSuccess("Compra parcelada atualizada!");
      } else if (editing) {
        const data = {
          card_id: parseInt(form.card_id),
          amount: parseFloat(form.amount),
          type: "expense" as const,
          description: form.description,
          date: form.date, // If editing, date usually doesn't shift again.
          category_id: form.category_id ? parseInt(form.category_id) : null,
        };
        await transactionsApi.update(editing.id, data);
        showSuccess("Compra atualizada!");
      } else {
        const totalAmount = parseFloat(form.amount);
        const installmentAmount = totalAmount / parsedInstallments;
        const [yearStr, monthStr, dayStr] = form.date.split("-");
        const purchaseYear = parseInt(yearStr);
        const purchaseMonth = parseInt(monthStr);
        const purchaseDay = parseInt(dayStr);
        
        let firstDueYear = purchaseYear;
        let firstDueMonth = purchaseMonth;
        const dueDay = selectedCard?.due_day ?? purchaseDay; // defaults to purchase day if no due day (Debit)

        if (isCredit && purchaseDay > dueDay) {
          firstDueMonth += 1;
          if (firstDueMonth > 12) {
            firstDueMonth = 1;
            firstDueYear += 1;
          }
        }

        const groupId = parsedInstallments > 1 ? `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : undefined;

        for (let i = 0; i < parsedInstallments; i++) {
          let instYear = firstDueYear;
          let instMonth = firstDueMonth + i;
          
          while (instMonth > 12) {
            instMonth -= 12;
            instYear += 1;
          }

          const paddedMonth = String(instMonth).padStart(2, "0");
          const paddedDay = String(isCredit ? dueDay : purchaseDay).padStart(2, "0");
          const invoiceDateStr = `${instYear}-${paddedMonth}-${paddedDay}`;
          const instDescription = parsedInstallments > 1 ? `${form.description} (${i + 1}/${parsedInstallments})` : form.description;

          const data = {
            card_id: parseInt(form.card_id),
            amount: installmentAmount,
            type: "expense" as const,
            description: instDescription,
            date: invoiceDateStr,
            purchase_date: form.date,
            category_id: form.category_id ? parseInt(form.category_id) : null,
            group_id: groupId,
            installment_number: parsedInstallments > 1 ? i + 1 : undefined,
            total_installments: parsedInstallments > 1 ? parsedInstallments : undefined,
          };
          
          await transactionsApi.create(data);
        }
        
        showSuccess(`Compra ${parsedInstallments > 1 ? `parcelada em ${parsedInstallments}x ` : ""}registrada!`);
      }
      
      setModalOpen(false);
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirm({ id });
  };

  const handleDeleteGroup = (groupId: string) => {
    setDeleteConfirm({ groupId });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      if (deleteConfirm.id) {
        await transactionsApi.delete(deleteConfirm.id);
        showSuccess("Compra excluída!");
      } else if (deleteConfirm.groupId) {
        await transactionsApi.deleteGroup(deleteConfirm.groupId);
        showSuccess("Grupo de parcelas excluído!");
      }
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const openEditGroup = (t: Transaction) => {
    if (!t.group_id) return;
    const groupTransactions = transactions.filter((tx) => tx.group_id === t.group_id);
    const firstTx = groupTransactions[0] || t;
    const totalAmount = groupTransactions.reduce((acc, tx) => acc + tx.amount, 0);

    setEditing(null);
    setEditingGroup(t.group_id);
    setForm({
      card_id: String(firstTx.card_id),
      amount: String(totalAmount),
      installments: String(firstTx.total_installments ?? 1),
      category_id: firstTx.category_id ? String(firstTx.category_id) : "",
      description: firstTx.description.replace(/ \(\d+\/\d+\)$/, ""),
      date: firstTx.purchase_date || firstTx.date,
    });
    setModalOpen(true);
  };

  const toggleStatus = async (t: Transaction) => {
    try {
      await transactionsApi.updateStatus(t.id);
      showSuccess("Status alterado com sucesso!");
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
          transactionsApi.updateStatus(id),
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
                  <th className="p-4 text-left">Data Compra</th>
                  <th className="p-4 text-left">Data Fatura</th>
                  <th className="p-4 text-left">Cartão</th>
                  <th className="p-4 text-left">Categoria</th>
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-center">Parcela</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Origem</th>
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
                      {t.purchase_date ? formatDate(t.purchase_date) : "—"}
                    </td>
                    <td className="p-4 text-sm text-white/70">
                      {t.date ? formatDate(t.date) : "—"}
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
                        ? `${t.installment_number ?? 1}/${t.total_installments}`
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
                    <td className="p-4 text-xs text-center text-gray-400">
                      {t.created_via ? (
                        <span className="capitalize">{t.created_via}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        {t.group_id && (
                          <button
                            onClick={() => openEditGroup(t)}
                            title="Editar Grupo"
                            className="p-1.5 rounded text-blue-400 hover:bg-blue-400/10 transition-colors border border-transparent hover:border-blue-400/20"
                          >
                            <Link className="w-3.5 h-3.5 origin-center -rotate-45" />
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(t)}
                          title="Editar"
                          className="p-1.5 rounded text-[#007bff] hover:bg-[#007bff]/10 transition-colors border border-transparent hover:border-[#007bff]/20"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(t)}
                          title="Alterar Status"
                          className="p-1.5 rounded text-emerald-500 hover:bg-emerald-500/10 transition-colors border border-transparent hover:border-emerald-500/20"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        {t.group_id && (
                          <button
                            onClick={() => handleDeleteGroup(t.group_id!)}
                            title="Excluir Todas Parcelas"
                            className="p-1.5 rounded text-amber-500 hover:bg-amber-500/10 transition-colors border border-transparent hover:border-amber-500/20"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t.id)}
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

      {/* Modal */}
      <GlassModal
        title={editing || editingGroup ? "Editar Compra" : "Nova Compra"}
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

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
        loading={deleting}
        title={deleteConfirm?.groupId ? "Excluir Parcelas" : "Excluir Compra"}
        message={
          deleteConfirm?.groupId
            ? "Tem certeza que deseja excluir TODAS as parcelas desta compra?"
            : "Tem certeza que deseja excluir esta compra?"
        }
      />
    </div>
  );
}
