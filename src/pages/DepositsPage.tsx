import { useEffect, useState } from "react";
import { depositsApi, banksApi } from "@/services/api";
import type { Deposit, Bank } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import ConfirmModal from "@/components/ConfirmModal";
import GlassInput from "@/components/GlassInput";
import { useToast } from "@/components/Toast";
import { Wallet, Plus, Pencil, Trash2, Filter } from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Deposit | null>(null);
  const { showSuccess, showError } = useToast();

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterBank, setFilterBank] = useState("");

  // Form
  const [form, setForm] = useState({
    bank_id: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const b = await banksApi.list();
      setBanks(b);

      const params: Record<string, string> = {};
      if (filterDateFrom) params.date_from = filterDateFrom;
      if (filterDateTo) params.date_to = filterDateTo;
      if (filterBank) params.bank_id = filterBank;

      setDeposits(await depositsApi.list(params));
    } catch {
      showError("Erro ao carregar depósitos");
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
    setLoading(true);
    setTimeout(load, 0);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      bank_id: banks[0]?.id?.toString() || "",
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    });
    setModalOpen(true);
  };

  const openEdit = (d: Deposit) => {
    setEditing(d);
    
    let matchedBankId = d.bank_id;
    if (!matchedBankId && d.bank_name) {
      const b = banks.find((bank) => bank.name === d.bank_name);
      if (b) matchedBankId = b.id;
    }

    setForm({
      bank_id: matchedBankId ? String(matchedBankId) : "",
      amount: String(d.amount),
      description: d.description,
      date: d.date,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        bank_id: parseInt(form.bank_id),
        amount: parseFloat(form.amount),
        description: form.description,
        date: form.date,
      };

      if (editing) {
        await depositsApi.update(editing.id, data);
        showSuccess("Depósito atualizado!");
      } else {
        await depositsApi.create(data);
        showSuccess("Depósito registrado!");
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
    setDeleteConfirm(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await depositsApi.delete(deleteConfirm);
      showSuccess("Depósito excluído!");
      load();
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
          <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
            Depósitos
          </h1>
          <p className="text-gray-400 mt-1">Registre suas entradas</p>
        </div>
        <GlassButton onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Novo Depósito
        </GlassButton>
      </div>

      {/* Filters */}
      <div className="glass-panel rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-400 uppercase tracking-widest">
          <Filter className="w-3.5 h-3.5" />
          Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-[#007bff]"
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
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
          <GlassButton size="sm" onClick={applyFilters}>
            Aplicar
          </GlassButton>
          <GlassButton size="sm" variant="secondary" onClick={clearFilters}>
            Limpar
          </GlassButton>
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
                  <th className="p-4 text-left">Banco</th>
                  <th className="p-4 text-left">Descrição</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-4 text-sm text-white/70">
                      {formatDate(d.date)}
                    </td>
                    <td className="p-4 text-sm text-white/80">
                      {d.bank_name || `#${d.bank_id}`}
                    </td>
                    <td className="p-4 text-sm text-white">
                      {d.description}
                    </td>
                    <td className="p-4 text-sm text-right font-semibold text-emerald-400">
                      +{formatBRL(d.amount)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(d)}
                          className="p-1.5 text-white/30 hover:text-[#007bff] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
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
        title={editing ? "Editar Depósito" : "Novo Depósito"}
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
            id="dep-bank"
            value={form.bank_id}
            onChange={(e) => setForm({ ...form, bank_id: e.target.value })}
          >
            <option value="">Selecione o banco</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <label htmlFor="dep-bank">Banco</label>
        </div>

        <GlassInput
          id="dep-amount"
          label="Valor"
          type="number"
          step="0.01"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          required
        />

        <GlassInput
          id="dep-date"
          label="Data"
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />

        <GlassInput
          id="dep-description"
          label="Descrição"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </GlassModal>

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
        loading={deleting}
        title="Excluir Depósito"
        message="Tem certeza que deseja excluir este depósito?"
      />
    </div>
  );
}
