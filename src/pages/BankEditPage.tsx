import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { banksApi, cardsApi } from "@/services/api";
import type { Bank, Card } from "@/types";
import GlassButton from "@/components/GlassButton";
import GlassInput from "@/components/GlassInput";
import CardSection from "@/components/CardSection";
import { useToast } from "@/components/Toast";
import { useInvalidateDashboard } from "@/hooks/useDashboardCache";
import { Building2, ArrowLeft, Save } from "lucide-react";

interface BankEditPageState {
  bank: Bank | null;
  cards: Card[];
  loading: boolean;
  saving: boolean;
  name: string;
  balance: string;
}

export default function BankEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const invalidateDashboard = useInvalidateDashboard();

  const [state, setState] = useState<BankEditPageState>({
    bank: null,
    cards: [],
    loading: true,
    saving: false,
    name: "",
    balance: "",
  });

  const loadBank = async () => {
    if (!id) {
      showError("Banco não encontrado");
      navigate("/banks");
      return;
    }

    try {
      const bankId = parseInt(id, 10);
      if (isNaN(bankId)) {
        showError("Banco não encontrado");
        navigate("/banks");
        return;
      }

      const [bank, cards] = await Promise.all([
        banksApi.get(bankId),
        cardsApi.listByBank(bankId),
      ]);

      setState((prev) => ({
        ...prev,
        bank,
        cards,
        name: bank.name,
        balance: String(bank.current_balance),
        loading: false,
      }));
    } catch {
      showError("Banco não encontrado");
      navigate("/banks");
    }
  };

  useEffect(() => {
    loadBank();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!state.bank) return;

    setState((prev) => ({ ...prev, saving: true }));
    try {
      const data = {
        name: state.name,
        current_balance: parseFloat(state.balance) || 0,
      };
      await banksApi.update(state.bank.id, data);
      showSuccess("Banco atualizado!");
      invalidateDashboard();
      
      // Update local state with new values
      setState((prev) => ({
        ...prev,
        bank: prev.bank ? { ...prev.bank, ...data } : null,
        saving: false,
      }));
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erro ao salvar banco");
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleBack = () => {
    navigate("/banks");
  };

  if (state.loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!state.bank) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
              Editar Banco
            </h1>
            <p className="text-gray-400 mt-1">
              Gerencie os dados e cartões do banco
            </p>
          </div>
        </div>
      </div>

      {/* Bank Form */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-[#007bff] to-blue-400 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="font-heading text-xl font-medium text-white tracking-tight">
            Dados do Banco
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <GlassInput
            id="bank-name"
            label="Nome do Banco"
            value={state.name}
            onChange={(e) =>
              setState((prev) => ({ ...prev, name: e.target.value }))
            }
            required
          />
          <GlassInput
            id="bank-balance"
            label="Saldo Atual"
            type="number"
            step="0.01"
            value={state.balance}
            onChange={(e) =>
              setState((prev) => ({ ...prev, balance: e.target.value }))
            }
          />
        </div>

        <div className="flex justify-end gap-3">
          <GlassButton variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </GlassButton>
          <GlassButton onClick={handleSave} loading={state.saving}>
            <Save className="w-4 h-4" />
            Salvar
          </GlassButton>
        </div>
      </div>

      {/* CardSection - Gerenciamento de Cartões */}
      <CardSection
        bankId={state.bank.id}
        cards={state.cards}
        onCardsChange={loadBank}
      />
    </div>
  );
}
