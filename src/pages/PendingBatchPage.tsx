import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { pendingApi, categoriesApi } from "@/services/api";
import type { PendingItem, Category } from "@/types";
import { useToast } from "@/components/Toast";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import GlassInput from "@/components/GlassInput";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Pencil, Trash2,
  CheckCheck, Send, FileText,
} from "lucide-react";

const formatBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const formatDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR");

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  approved: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  rejected: "text-red-400 bg-red-400/10 border-red-400/20",
  confirmed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
  confirmed: <CheckCheck className="w-3 h-3" />,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  confirmed: "Confirmado",
};

export default function PendingBatchPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [items, setItems] = useState<PendingItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [editItem, setEditItem] = useState<PendingItem | null>(null);
  const [editForm, setEditForm] = useState({
    descricao: "",
    valor: "",
    data_compra: "",
    category_id: "",
    installment_number: "",
    total_installments: "",
    valor_tipo: "parcela" as "parcela" | "total",
    criar_todas: false,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!batchId) return;
    try {
      const [its, cats] = await Promise.all([
        pendingApi.listBatch(batchId),
        categoriesApi.list(),
      ]);
      setItems(its);
      setCategories(cats);
    } catch {
      // 404 é esperado se o lote não existe mais — não quebra a tela
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [batchId]);

  const setStatus = async (id: number, status: string) => {
    try {
      await pendingApi.setStatus(id, status);
      setItems(prev => prev.map(i => i.id === id ? { ...i, status: status as PendingItem["status"] } : i));
    } catch {
      showError("Erro ao atualizar status");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await pendingApi.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
      showSuccess("Item removido");
    } catch {
      showError("Erro ao remover item");
    }
  };

  const openEdit = (item: PendingItem) => {
    setEditItem(item);
    const isParcelado = !!(item.total_installments && item.total_installments > 1);
    setEditForm({
      descricao: item.descricao,
      valor: String(item.valor),
      data_compra: item.data_compra,
      category_id: String(item.category_id ?? ""),
      installment_number: String(item.installment_number ?? ""),
      total_installments: String(item.total_installments ?? ""),
      valor_tipo: "parcela",
      criar_todas: isParcelado,
    });
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    try {
      const isParcelado = editForm.criar_todas;
      const total = isParcelado ? (parseInt(editForm.total_installments) || 1) : 1;
      const current = isParcelado ? (parseInt(editForm.installment_number) || 1) : 1;
      const rawValor = parseFloat(editForm.valor);
      const valorParcela = isParcelado && editForm.valor_tipo === "total" ? rawValor / total : rawValor;

      const updated = await pendingApi.update(editItem.id, {
        descricao: editForm.descricao,
        valor: valorParcela,
        data_compra: editForm.data_compra,
        category_id: editForm.category_id ? parseInt(editForm.category_id) : undefined,
        installment_number: isParcelado && total > 1 ? current : undefined,
        total_installments: isParcelado && total > 1 ? total : undefined,
      });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      setEditItem(null);
      showSuccess("Item atualizado");
    } catch {
      showError("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const approveAll = async () => {
    const pending = items.filter(i => i.status === "pending");
    await Promise.all(pending.map(i => setStatus(i.id, "approved")));
    showSuccess(`${pending.length} item(s) aprovado(s)`);
  };

  const confirmBatch = async () => {
    if (!batchId) return;
    const approved = items.filter(i => i.status === "approved");
    if (approved.length === 0) {
      showError("Aprove pelo menos um item antes de confirmar");
      return;
    }
    setConfirming(true);
    try {
      const res = await pendingApi.confirmBatch(batchId);
      showSuccess(res.message);
      // Atualiza localmente sem recarregar do servidor
      setItems(prev => prev.map(i =>
        i.status === "approved" ? { ...i, status: "confirmed" as const } : i
      ));
    } catch (e: unknown) {
      showError((e as Error).message);
    } finally {
      setConfirming(false);
    }
  };

  const pendingCount = items.filter(i => i.status === "pending").length;
  const approvedCount = items.filter(i => i.status === "approved").length;
  const filename = items[0]?.filename;
  const cardName = items[0]?.card_name;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/pending")}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              <h1 className="text-lg font-heading font-bold text-white">
                {filename || "Extrato"}
              </h1>
            </div>
            <p className="text-xs text-white/40 mt-0.5">
              {cardName} · {items.length} transação(ões)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && (
            <GlassButton variant="secondary" size="sm" onClick={approveAll}>
              <CheckCheck className="w-3.5 h-3.5" />
              Aprovar todos
            </GlassButton>
          )}
          <GlassButton
            size="sm"
            onClick={confirmBatch}
            disabled={approvedCount === 0 || confirming}
          >
            <Send className="w-3.5 h-3.5" />
            {confirming ? "Salvando..." : `Confirmar ${approvedCount > 0 ? `(${approvedCount})` : ""}`}
          </GlassButton>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Pendentes", value: pendingCount, color: "text-amber-400" },
          { label: "Aprovados", value: approvedCount, color: "text-emerald-400" },
          { label: "Rejeitados", value: items.filter(i => i.status === "rejected").length, color: "text-red-400" },
        ].map(s => (
          <div key={s.label} className="glass-panel rounded-xl p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/40 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Data</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Valor</th>
                  <th className="text-center px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map(item => (
                  <tr key={item.id} className={`transition-colors ${item.status === "rejected" ? "opacity-40" : ""}`}>
                    <td className="px-4 py-3 text-white/60 whitespace-nowrap">{formatDate(item.data_compra)}</td>
                    <td className="px-4 py-3 text-white max-w-[240px]">
                      <p className="truncate">{item.descricao}</p>
                      {item.category_name && (
                        <p className="text-xs text-white/30 mt-0.5">{item.category_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">{item.tipo}</td>
                    <td className="px-4 py-3 text-right font-medium text-white whitespace-nowrap">
                      {formatBRL(item.valor)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${STATUS_COLORS[item.status]}`}>
                        {STATUS_ICONS[item.status]}
                        {STATUS_LABELS[item.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {item.status !== "approved" && item.status !== "confirmed" && (
                          <button onClick={() => setStatus(item.id, "approved")}
                            className="w-7 h-7 rounded-lg hover:bg-emerald-500/20 text-white/30 hover:text-emerald-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Aprovar">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {item.status !== "rejected" && item.status !== "confirmed" && (
                          <button onClick={() => setStatus(item.id, "rejected")}
                            className="w-7 h-7 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Rejeitar">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {item.status !== "confirmed" && (
                          <button onClick={() => openEdit(item)}
                            className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/30 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Editar">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(item.id)}
                          className="w-7 h-7 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                          title="Remover">
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

      {/* Edit Modal */}
      {editItem && (
        <GlassModal isOpen onClose={() => setEditItem(null)} title="Editar transação">
          <div className="space-y-4">
            <GlassInput
              label="Descrição"
              value={editForm.descricao}
              onChange={e => setEditForm(f => ({ ...f, descricao: e.target.value }))}
            />

            <GlassInput
              label="Valor (R$)"
              type="number"
              step="0.01"
              value={editForm.valor}
              onChange={e => setEditForm(f => ({ ...f, valor: e.target.value }))}
            />

            <GlassInput
              label="Data da compra"
              type="date"
              value={editForm.data_compra}
              onChange={e => setEditForm(f => ({ ...f, data_compra: e.target.value }))}
            />

            {/* Toggle: é parcelado? */}
            <button
              onClick={() => setEditForm(f => ({
                ...f,
                criar_todas: !f.criar_todas,
                installment_number: !f.criar_todas ? f.installment_number : "",
                total_installments: !f.criar_todas ? f.total_installments : "",
                valor_tipo: "parcela",
              }))}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
                editForm.criar_todas
                  ? "bg-[#007bff]/10 border-[#007bff]/40 text-white"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:border-white/20"
              }`}
            >
              <span className="text-xs font-medium uppercase tracking-wider">É compra parcelada?</span>
              <div className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${editForm.criar_todas ? "bg-[#007bff]" : "bg-white/10"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${editForm.criar_todas ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </button>

            {/* Campos de parcelamento — só aparecem se ativado */}
            {editForm.criar_todas && (
              <div className="space-y-3 pl-1 border-l-2 border-[#007bff]/30">
                {/* Tipo de valor */}
                <div className="flex gap-2">
                  {(["parcela", "total"] as const).map(tipo => (
                    <button
                      key={tipo}
                      onClick={() => setEditForm(f => ({ ...f, valor_tipo: tipo }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                        editForm.valor_tipo === tipo
                          ? "bg-[#007bff]/20 border-[#007bff]/50 text-white"
                          : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                      }`}
                    >
                      {tipo === "parcela" ? "Valor por parcela" : "Valor total"}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <GlassInput
                    label="Parcela atual"
                    type="number"
                    min="1"
                    value={editForm.installment_number}
                    onChange={e => setEditForm(f => ({ ...f, installment_number: e.target.value }))}
                    placeholder="ex: 3"
                  />
                  <GlassInput
                    label="Total de parcelas"
                    type="number"
                    min="1"
                    value={editForm.total_installments}
                    onChange={e => setEditForm(f => ({ ...f, total_installments: e.target.value }))}
                    placeholder="ex: 12"
                  />
                </div>

                {/* Preview */}
                {editForm.valor && parseInt(editForm.total_installments) > 1 && (
                  <p className="text-xs text-white/40">
                    {editForm.valor_tipo === "total"
                      ? `≈ ${(parseFloat(editForm.valor) / parseInt(editForm.total_installments)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por parcela`
                      : `Total: ${(parseFloat(editForm.valor) * parseInt(editForm.total_installments)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`
                    }
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs text-white/50 mb-1.5 uppercase tracking-wider">Categoria</label>
              <select
                value={editForm.category_id}
                onChange={e => setEditForm(f => ({ ...f, category_id: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#007bff]/50"
              >
                <option value="">Sem categoria</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <GlassButton variant="secondary" className="flex-1" onClick={() => setEditItem(null)}>
                Cancelar
              </GlassButton>
              <GlassButton className="flex-1" onClick={saveEdit} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </GlassButton>
            </div>
          </div>
        </GlassModal>
      )}
    </div>
  );
}
