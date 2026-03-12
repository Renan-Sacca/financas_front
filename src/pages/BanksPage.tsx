import { useEffect, useState } from "react";
import { banksApi } from "@/services/api";
import type { Bank } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import ConfirmModal from "@/components/ConfirmModal";
import GlassInput from "@/components/GlassInput";
import { useToast } from "@/components/Toast";
import { useInvalidateDashboard } from "@/hooks/useDashboardCache";
import { Building2, Plus, Pencil, Trash2, DollarSign } from "lucide-react";

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Bank | null>(null);
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showSuccess, showError } = useToast();
  const invalidateDashboard = useInvalidateDashboard();

  const load = async () => {
    try {
      const data = await banksApi.list();
      setBanks(data);
    } catch {
      showError("Erro ao carregar bancos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null);
    setName("");
    setBalance("0");
    setModalOpen(true);
  };

  const openEdit = (bank: Bank) => {
    setEditing(bank);
    setName(bank.name);
    setBalance(String(bank.current_balance));
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { name, current_balance: parseFloat(balance) || 0 };
      if (editing) {
        await banksApi.update(editing.id, data);
        showSuccess("Banco atualizado!");
      } else {
        await banksApi.create(data);
        showSuccess("Banco criado!");
      }
      setModalOpen(false);
      invalidateDashboard();
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao salvar banco");
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
      await banksApi.delete(deleteConfirm);
      showSuccess("Banco excluído!");
      invalidateDashboard();
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao excluir banco");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
            Bancos
          </h1>
          <p className="text-gray-400 mt-1">Gerencie suas contas bancárias</p>
        </div>
        <GlassButton onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Novo Banco
        </GlassButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : banks.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Nenhum banco cadastrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banks.map((bank) => (
            <div
              key={bank.id}
              className="glass-panel glass-panel-hover rounded-2xl p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#007bff] to-blue-400 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(bank)}
                    className="p-2 text-white/40 hover:text-[#007bff] transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(bank.id)}
                    className="p-2 text-white/40 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-heading text-xl font-medium text-white tracking-tight mb-2">
                {bank.name}
              </h3>
              <div className="flex items-center gap-2 text-lg">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span className="font-heading font-bold text-white">
                  {formatBRL(bank.current_balance)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <GlassModal
        title={editing ? "Editar Banco" : "Novo Banco"}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <GlassButton
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </GlassButton>
            <GlassButton onClick={handleSave} loading={saving}>
              Salvar
            </GlassButton>
          </>
        }
      >
        <GlassInput
          id="bank-name"
          label="Nome do Banco"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <GlassInput
          id="bank-balance"
          label="Saldo Atual"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
      </GlassModal>

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
        loading={deleting}
        title="Excluir Banco"
        message="Tem certeza que deseja excluir este banco?"
      />
    </div>
  );
}
