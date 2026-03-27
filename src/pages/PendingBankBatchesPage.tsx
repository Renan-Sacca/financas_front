import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pendingBankApi } from "@/services/api";
import type { BankBatchSummary } from "@/types";
import { useToast } from "@/components/Toast";
import { Building2, ChevronRight, CheckCircle, XCircle, Clock, FileText } from "lucide-react";

const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

export default function PendingBankBatchesPage() {
  const [batches, setBatches] = useState<BankBatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showError } = useToast();

  useEffect(() => {
    pendingBankApi.listBatches()
      .then(setBatches)
      .catch(() => showError("Erro ao carregar lotes"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-heading font-bold text-white">Extratos Bancários Pendentes</h1>
          <p className="text-sm text-white/40">Revise e confirme os lançamentos importados antes de salvar</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : batches.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Building2 className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Nenhum extrato bancário pendente. Envie um arquivo pelo chat.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batches.map((b) => {
            const allDone = b.pending === 0;
            return (
              <button
                key={b.batch_id}
                onClick={() => navigate(`/pending-bank/${b.batch_id}`)}
                className="w-full glass-panel rounded-2xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-white/40" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {b.filename || "Extrato Bancário"}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {b.bank_name ?? "Banco não definido"} · {formatDate(b.created_at)}
                  </p>
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
      )}
    </div>
  );
}
