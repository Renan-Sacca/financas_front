import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { depositsApi, banksApi } from "@/services/api";
import type { Deposit, Bank, IncomeType, PaymentMethod, IncomeCategory } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import ConfirmModal from "@/components/ConfirmModal";
import GlassInput from "@/components/GlassInput";
import Dropdown from "@/components/Dropdown";
import GlassDropdown from "@/components/GlassDropdown";
import { useToast } from "@/components/Toast";
import { useInvalidateDashboard } from "@/hooks/useDashboardCache";
import { Wallet, Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, Settings } from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

const getCurrentMonthRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  return {
    from: firstDay.toISOString().split("T")[0],
    to: lastDay.toISOString().split("T")[0],
  };
};

export default function DepositsPage() {
  const navigate = useNavigate();
  const [allDeposits, setAllDeposits] = useState<Deposit[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<IncomeType[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { showSuccess, showError } = useToast();
  const invalidateDashboard = useInvalidateDashboard();

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState(() => getCurrentMonthRange().from);
  const [filterDateTo, setFilterDateTo] = useState(() => getCurrentMonthRange().to);
  const [filterBank, setFilterBank] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Form
  const [form, setForm] = useState({
    bank_id: "",
    amount: "",
    description: "",
    type_id: "",
    payment_method_id: "",
    income_category_id: "",
    date: new Date().toISOString().split("T")[0],
    addToBalance: true,
  });
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Deposit | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Quick create category modal
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#007bff");
  const [newCatSaving, setNewCatSaving] = useState(false);
  const balanceCheckRef = useRef<HTMLLabelElement>(null);

  const loadLookups = async () => {
    try {
      const [b, it, pm, ic] = await Promise.all([
        banksApi.list(),
        depositsApi.listIncomeTypes(),
        depositsApi.listPaymentMethods(),
        depositsApi.listIncomeCategories(),
      ]);
      setBanks(b);
      setIncomeTypes(it);
      setPaymentMethods(pm);
      setIncomeCategories(ic);
    } catch {
      showError("Erro ao carregar dados auxiliares");
    }
  };

  const loadDeposits = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (filterBank) params.bank_id = filterBank;
      if (filterType) params.type_id = filterType;
      if (filterPaymentMethod) params.payment_method_id = filterPaymentMethod;
      if (filterCategory) params.income_category_id = filterCategory;
      const data = await depositsApi.list(params);
      setAllDeposits(data);
    } catch {
      showError("Erro ao carregar depósitos");
    } finally {
      setLoading(false);
    }
  };

  const load = async () => {
    await loadLookups();
    await loadDeposits();
  };

  const totalItems = allDeposits.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const deposits = allDeposits.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => { setPage(1); setLoading(true); loadDeposits(); };
  const clearFilters = () => {
    const range = getCurrentMonthRange();
    setFilterDateFrom(range.from);
    setFilterDateTo(range.to);
    setFilterBank("");
    setFilterType("");
    setFilterPaymentMethod("");
    setFilterCategory("");
    setPage(1);
    setLoading(true);
    setTimeout(loadDeposits, 0);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      bank_id: banks[0]?.id?.toString() || "",
      amount: "",
      description: "",
      type_id: incomeTypes[0]?.id?.toString() || "",
      payment_method_id: paymentMethods[0]?.id?.toString() || "",
      income_category_id: "",
      date: new Date().toISOString().split("T")[0],
      addToBalance: true,
    });
    setModalOpen(true);
  };

  const openEdit = (d: Deposit) => {
    setEditing(d);
    setForm({
      bank_id: String(d.bank_id),
      amount: String(d.amount),
      description: d.description || "",
      type_id: String(d.type_id),
      payment_method_id: String(d.payment_method_id),
      income_category_id: d.income_category_id ? String(d.income_category_id) : "",
      date: d.date,
      addToBalance: false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.type_id || !form.payment_method_id || !form.amount || !form.date || !form.bank_id) {
      showError("Preencha os campos obrigatórios");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await depositsApi.update(editing.id, {
          bank_id: parseInt(form.bank_id),
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          type_id: parseInt(form.type_id),
          payment_method_id: parseInt(form.payment_method_id),
          income_category_id: form.income_category_id ? parseInt(form.income_category_id) : null,
          date: form.date,
          adjust_balance: form.addToBalance,
        });
        showSuccess("Depósito atualizado!");
      } else {
        await depositsApi.create({
          bank_id: parseInt(form.bank_id),
          amount: parseFloat(form.amount),
          description: form.description || undefined,
          type_id: parseInt(form.type_id),
          payment_method_id: parseInt(form.payment_method_id),
          income_category_id: form.income_category_id ? parseInt(form.income_category_id) : null,
          date: form.date,
          add_to_balance: form.addToBalance,
        });
        showSuccess("Depósito registrado!");
      }
      setModalOpen(false);
      invalidateDashboard();
      loadDeposits();
      loadLookups();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await depositsApi.delete(deleteConfirm);
      showSuccess("Depósito excluído!");
      invalidateDashboard();
      loadDeposits();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">Depósitos</h1>
          <p className="text-gray-400 mt-1">Registre suas entradas</p>
        </div>
        <div className="flex gap-2">
          <GlassButton variant="secondary" onClick={() => navigate("/categories?mode=income")} className="!text-white">
            <Settings className="w-4 h-4" />
            Categorias
          </GlassButton>
          <GlassButton onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Novo Depósito
          </GlassButton>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel overflow-visible rounded-2xl p-4 relative z-20">
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 relative z-30">
          <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#007bff]"
            style={{ colorScheme: "dark" }} />
          <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#007bff]"
            style={{ colorScheme: "dark" }} />
          <Dropdown options={[{ value: "", label: "Todos os bancos" }, ...banks.map((b) => ({ value: b.id, label: b.name }))]}
            value={filterBank} onChange={setFilterBank} placeholder="Todos os bancos" />
          <Dropdown options={[{ value: "", label: "Todos os tipos" }, ...incomeTypes.map((t) => ({ value: t.id, label: t.name }))]}
            value={filterType} onChange={setFilterType} placeholder="Todos os tipos" />
          <Dropdown options={[{ value: "", label: "Todas as formas" }, ...paymentMethods.map((p) => ({ value: p.id, label: p.name }))]}
            value={filterPaymentMethod} onChange={setFilterPaymentMethod} placeholder="Todas as formas" />
          <Dropdown options={[{ value: "", label: "Todas as categorias" }, ...incomeCategories.map((c) => ({ value: c.id, label: c.name }))]}
            value={filterCategory} onChange={setFilterCategory} placeholder="Todas as categorias" />
          <GlassButton size="sm" onClick={applyFilters}>Aplicar</GlassButton>
          <GlassButton size="sm" variant="secondary" onClick={clearFilters} className="!text-white">Limpar</GlassButton>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : deposits.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum depósito encontrado</p>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-widest">
                  <th className="p-4 text-left">Data</th>
                  <th className="p-4 text-left">Tipo</th>
                  <th className="p-4 text-left">Pagamento</th>
                  <th className="p-4 text-left">Categoria</th>
                  <th className="p-4 text-left">Banco</th>
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-sm text-white/70">{formatDate(d.date)}</td>
                    <td className="p-4 text-sm text-white/80">{d.type_name || "-"}</td>
                    <td className="p-4 text-sm text-white/80">{d.payment_method_name || "-"}</td>
                    <td className="p-4 text-sm">
                      {d.income_category_name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.income_category_color || "#007bff" }} />
                          {d.income_category_name}
                        </span>
                      ) : <span className="text-white/30">-</span>}
                    </td>
                    <td className="p-4 text-sm text-white/80">{d.bank_name || "-"}</td>
                    <td className="p-4 text-sm text-white">{d.description || "-"}</td>
                    <td className="p-4 text-sm text-right font-semibold text-emerald-400">+{formatBRL(d.amount)}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(d)} title="Editar"
                          className="p-1.5 rounded text-[#007bff] hover:bg-[#007bff]/10 transition-colors border border-transparent hover:border-[#007bff]/20">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(d.id)} title="Excluir"
                          className="p-1.5 rounded text-red-500 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-white/10 flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                Mostrando {deposits.length} de {totalItems} registros
              </span>
              <div className="flex items-center gap-1">
                {[10, 20, 30].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setPerPage(n); setPage(1); }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      perPage === n
                        ? "bg-[#007bff] text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {(() => {
                const pages: number[] = [];
                const start = Math.max(1, page - 3);
                const end = Math.min(totalPages, page + 3);
                for (let i = start; i <= end; i++) {
                  pages.push(i);
                }
                return pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                      p === page
                        ? "bg-[#007bff] text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {p}
                  </button>
                ));
              })()}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                »
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Deposit Modal */}
      <GlassModal title={editing ? "Editar Depósito" : "Novo Depósito"} isOpen={modalOpen} onClose={() => setModalOpen(false)}
        footer={<>
          <GlassButton variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</GlassButton>
          <GlassButton onClick={handleSave} loading={saving}>Salvar</GlassButton>
        </>}>
        <GlassInput id="dep-description" label="Descrição" value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <GlassInput id="dep-amount" label="Valor *" type="number" step="0.01" value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
        <GlassDropdown id="dep-type" label="Tipo de Entrada *"
          options={incomeTypes.map((t) => ({ value: t.id, label: t.name }))}
          value={form.type_id} onChange={(val) => setForm({ ...form, type_id: val })} />
        <GlassDropdown id="dep-payment" label="Forma de Pagamento *"
          options={paymentMethods.map((p) => ({ value: p.id, label: p.name }))}
          value={form.payment_method_id} onChange={(val) => setForm({ ...form, payment_method_id: val })} />
        <GlassDropdown id="dep-category" label="Categoria de Entrada"
          options={[{ value: "", label: "Nenhuma" }, ...incomeCategories.map((c) => ({ value: c.id, label: c.name }))]}
          value={form.income_category_id} onChange={(val) => setForm({ ...form, income_category_id: val })} />
        <button type="button" onClick={() => { setNewCatName(""); setNewCatColor("#007bff"); setNewCatOpen(true); }}
          className="flex items-center gap-1.5 text-xs text-[#007bff] hover:text-white transition-colors cursor-pointer -mt-2">
          <Plus className="w-3.5 h-3.5" />
          Criar nova categoria
        </button>
        <GlassInput id="dep-date" label="Data *" type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        <GlassDropdown id="dep-bank" label="Banco *"
          options={banks.map((b) => ({ value: b.id, label: b.name }))}
          value={form.bank_id} onChange={(val) => {
            setForm({ ...form, bank_id: val, addToBalance: true });
            setTimeout(() => balanceCheckRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
          }} />
        {form.bank_id && (
          <label ref={balanceCheckRef} className="flex items-center gap-2 -mt-1 cursor-pointer select-none">
            <input type="checkbox" checked={form.addToBalance}
              onChange={(e) => setForm({ ...form, addToBalance: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#007bff] accent-[#007bff]" />
            <span className="text-xs text-white/60">
              {editing ? "Ajustar saldo do banco com a diferença" : "Atribuir valor ao saldo do banco"}
            </span>
          </label>
        )}
      </GlassModal>

      <ConfirmModal isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete} loading={deleting} title="Excluir Depósito"
        message="Tem certeza que deseja excluir este depósito?" />

      {/* Quick Create Category Modal */}
      <GlassModal title="Nova Categoria de Entrada" isOpen={newCatOpen} onClose={() => setNewCatOpen(false)}
        footer={<>
          <GlassButton variant="secondary" onClick={() => setNewCatOpen(false)}>Cancelar</GlassButton>
          <GlassButton loading={newCatSaving} onClick={async () => {
            if (!newCatName.trim()) { showError("Informe o nome"); return; }
            setNewCatSaving(true);
            try {
              const created = await depositsApi.createIncomeCategory({ name: newCatName.trim(), color: newCatColor });
              const cats = await depositsApi.listIncomeCategories();
              setIncomeCategories(cats);
              setForm((f) => ({ ...f, income_category_id: String(created.id) }));
              setNewCatOpen(false);
              showSuccess("Categoria criada!");
            } catch (err) {
              showError(err instanceof Error ? err.message : "Erro");
            } finally {
              setNewCatSaving(false);
            }
          }}>Salvar</GlassButton>
        </>}>
        <GlassInput id="new-cat-name" label="Nome da Categoria" value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)} required />
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Cor</label>
          <input type="color" value={newCatColor} onChange={(e) => setNewCatColor(e.target.value)}
            className="w-12 h-10 border-0 bg-transparent cursor-pointer" />
          <span className="text-xs text-gray-500 font-mono">{newCatColor}</span>
        </div>
      </GlassModal>
    </div>
  );
}
