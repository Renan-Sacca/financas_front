import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { pendingApi, pendingBankApi } from "@/services/api";
import type { BatchSummary, BankBatchSummary } from "@/types";
import { useToast } from "@/components/Toast";
import { ClipboardList, ChevronRight, CheckCircle, XCircle, Clock, FileText, CreditCard, Building2 } from "lucide-react";

const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

function BatchList({
  batches,
  onNavigate,
  emptyText,
}: {
  batches: (BatchSummary | BankBatchSummary)[];
  onNavigate: (id: string) => void;
  emptyText: string;
}) {
  if (batches.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center">
        <ClipboardList className="w-12 h-12 text-white/20 mx-auto mb-3" />
        <p className="text-white/40 text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((b) => {
        const allDone = b.pending === 0;
        const subtitle = "card_name" in b
          ? `${b.card_name} · ${b.bank_name} · ${formatDate(b.created_at)}`
          : `${b.bank_name ?? "Banco não definido"} · ${formatDate(b.created_at)}`;

        return (
          <button
            key={b.batch_id}
            onClick={() => onNavigate(b.batch_id)}
            className="w-full glass-panel rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white/40" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {b.filename || "Extrato"}
              </p>
              <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Clock className="w-3 h-3" /> {b.pending} pendente{b.pending !== 1 ? "s" : ""}
                </span>
                <span className="flex items-center gap-1 text-xs text-emerald-400">
                  <CheckCircle className="w-3 h-3" /> {b.approved} aprovado{b.approved !== 1 ? "s" : ""}
                </span>
                {b.rejected > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-400">
                    <XCircle className="w-3 h-3" /> {b.rejected} rejeitado{b.rejected !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {allDone && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  Revisado
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-white/30" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function PendingBatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "bank" ? "bank" : "card";

  const [cardBatches, setCardBatches] = useState<BatchSummary[]>([]);
  const [bankBatches, setBankBatches] = useState<BankBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showError } = useToast();

  useEffect(() => {
    setLoading(true);
    const req = mode === "bank"
      ? pendingBankApi.listBatches().then(setBankBatches)
      : pendingApi.listBatches().then(setCardBatches);
    req
      .catch(() => showError("Erro ao carregar lotes"))
      .finally(() => setLoading(false));
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (m: "card" | "bank") =>
    setSearchParams(m === "bank" ? { mode: "bank" } : {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
          Extratos Pendentes
        </h1>
        <p className="text-gray-400 mt-1">Revise e confirme os lançamentos importados antes de salvar</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => switchMode("card")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer ${
            mode === "card"
              ? "bg-[#007bff] text-white shadow-lg shadow-blue-900/40"
              : "glass-panel text-white/50 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Fatura Cartão
          </span>
        </button>
        <button
          onClick={() => switchMode("bank")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all cursor-pointer ${
            mode === "bank"
              ? "bg-[#007bff] text-white shadow-lg shadow-blue-900/40"
              : "glass-panel text-white/50 hover:text-white"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Extrato Banco
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : mode === "card" ? (
        <BatchList
          batches={cardBatches}
          onNavigate={(id) => navigate(`/pending/${id}`)}
          emptyText="Nenhuma fatura pendente. Envie um arquivo pelo chat."
        />
      ) : (
        <BatchList
          batches={bankBatches}
          onNavigate={(id) => navigate(`/pending-bank/${id}`)}
          emptyText="Nenhum extrato bancário pendente. Envie um arquivo pelo chat."
        />
      )}
    </div>
  );
}
