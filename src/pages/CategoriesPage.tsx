import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { categoriesApi, depositsApi } from "@/services/api";
import type { Category, IncomeCategory } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassModal from "@/components/GlassModal";
import ConfirmModal from "@/components/ConfirmModal";
import GlassInput from "@/components/GlassInput";
import { useToast } from "@/components/Toast";
import { useInvalidateDashboard } from "@/hooks/useDashboardCache";
import { Tag, Plus, Pencil, Trash2, Wallet } from "lucide-react";

type CatItem = { id: number; name: string; color: string };

const modeConfig = {
  expense: {
    title: "Categorias de Gastos",
    subtitle: "Organize seus gastos",
    emptyText: "Nenhuma categoria de gastos cadastrada",
    icon: Tag,
  },
  income: {
    title: "Categorias de Entrada",
    subtitle: "Organize suas entradas",
    emptyText: "Nenhuma categoria de entrada cadastrada",
    icon: Wallet,
  },
};

export default function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "income" ? "income" : "expense";
  const config = modeConfig[mode];

  const [categories, setCategories] = useState<CatItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatItem | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#007bff");
  const [saving, setSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { showSuccess, showError } = useToast();
  const invalidateDashboard = useInvalidateDashboard();

  const load = async () => {
    setLoading(true);
    try {
      if (mode === "income") {
        const data = await depositsApi.listIncomeCategories();
        setCategories(data.map((c: IncomeCategory) => ({ id: c.id, name: c.name, color: c.color || "#007bff" })));
      } else {
        const data = await categoriesApi.list();
        setCategories(data.map((c: Category) => ({ id: c.id, name: c.name, color: c.color })));
      }
    } catch {
      showError("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (m: "expense" | "income") => {
    setSearchParams(m === "income" ? { mode: "income" } : {});
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setColor("#007bff");
    setModalOpen(true);
  };

  const openEdit = (cat: CatItem) => {
    setEditing(cat);
    setName(cat.name);
    setColor(cat.color);
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (mode === "income") {
        if (editing) {
          await depositsApi.updateIncomeCategory(editing.id, { name, color });
          showSuccess("Categoria atualizada!");
        } else {
          await depositsApi.createIncomeCategory({ name, color });
          showSuccess("Categoria criada!");
        }
      } else {
        if (editing) {
          await categoriesApi.update(editing.id, { name, color });
          showSuccess("Categoria atualizada!");
        } else {
          await categoriesApi.create({ name, color });
          showSuccess("Categoria criada!");
        }
      }
      setModalOpen(false);
      invalidateDashboard();
      load();
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
      if (mode === "income") {
        await depositsApi.deleteIncomeCategory(deleteConfirm);
      } else {
        await categoriesApi.delete(deleteConfirm);
      }
      showSuccess("Categoria excluída!");
      invalidateDashboard();
      load();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro");
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const Icon = config.icon;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
            {config.title}
          </h1>
          <p className="text-gray-400 mt-1">{config.subtitle}</p>
        </div>
        <GlassButton onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nova Categoria
        </GlassButton>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => switchMode("expense")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${
            mode === "expense"
              ? "bg-[#007bff] text-white shadow-lg shadow-blue-900/40"
              : "glass-panel text-white/50 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Gastos
          </span>
        </button>
        <button
          onClick={() => switchMode("income")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all ${
            mode === "income"
              ? "bg-[#007bff] text-white shadow-lg shadow-blue-900/40"
              : "glass-panel text-white/50 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Wallet className="w-3.5 h-3.5" />
            Entradas
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : categories.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Icon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">{config.emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="glass-panel glass-panel-hover rounded-2xl p-5 group flex items-center gap-4"
            >
              <div
                className="w-10 h-10 rounded-lg shrink-0 border border-white/10 group-hover:scale-110 transition-transform duration-75"
                style={{ backgroundColor: cat.color }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-heading text-base font-medium text-white truncate">
                  {cat.name}
                </h3>
                <p className="text-xs text-gray-500 font-mono">{cat.color}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="p-1.5 text-white/40 hover:text-[#007bff] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(cat.id)}
                  className="p-1.5 text-white/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GlassModal
        title={editing ? "Editar Categoria" : "Nova Categoria"}
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
          id="cat-name"
          label="Nome da Categoria"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Cor</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-10 border-0 bg-transparent cursor-pointer"
          />
          <span className="text-xs text-gray-500 font-mono">{color}</span>
        </div>
      </GlassModal>

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={executeDelete}
        loading={deleting}
        title="Excluir Categoria"
        message="Tem certeza que deseja excluir esta categoria?"
      />
    </div>
  );
}
