import { useEffect, useState } from "react";
import { summaryApi, transactionsApi, banksApi, categoriesApi, cardsApi } from "@/services/api";
import type { FinancialSummary, Bank, Category, Card } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  DollarSign,
  ShieldCheck,
} from "lucide-react";
import GlassButton from "@/components/GlassButton";

const CHART_COLORS = [
  "#007bff",
  "#22d3ee",
  "#a855f7",
  "#f43f5e",
  "#10b981",
  "#f59e0b",
  "#6366f1",
  "#ec4899",
];

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<
    { name: string; total: number }[]
  >([]);
  const [cardPieData, setCardPieData] = useState<
    { name: string; value: number }[]
  >([]);
  const [categoryPieData, setCategoryPieData] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [, setCategories] = useState<Category[]>([]);
  const [, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterBank, setFilterBank] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const loadData = async () => {
    try {
      const [summaryData, banksList, catList, cardsList] = await Promise.all([
        summaryApi.get(),
        banksApi.list(),
        categoriesApi.list(),
        cardsApi.list(),
      ]);
      setSummary(summaryData);
      setBanks(banksList);
      setCategories(catList);
      setCards(cardsList);

      // Load transactions for charts
      const params: Record<string, string> = {};
      if (filterBank) params.bank_id = filterBank;
      if (filterYear) params.year = filterYear;
      if (filterMonth) params.month = filterMonth;

      const transactions = await transactionsApi.list(params);

      // Monthly data
      const monthMap: Record<string, number> = {};
      transactions.forEach((t) => {
        const d = new Date(t.date);
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
        monthMap[key] = (monthMap[key] || 0) + t.amount;
      });
      setMonthlyData(
        Object.entries(monthMap)
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => {
            const [ma, ya] = a.name.split("/").map(Number);
            const [mb, yb] = b.name.split("/").map(Number);
            return ya - yb || ma - mb;
          }),
      );

      // Card pie
      const cardMap: Record<string, number> = {};
      transactions.forEach((t) => {
        const cardName = t.card_name || `Cartão ${t.card_id}`;
        cardMap[cardName] = (cardMap[cardName] || 0) + t.amount;
      });
      setCardPieData(
        Object.entries(cardMap).map(([name, value]) => ({ name, value })),
      );

      // Category pie
      const catMap: Record<string, { value: number; color: string }> = {};
      transactions.forEach((t) => {
        const catName = t.category_name || "Sem categoria";
        const catColor = t.category_color || "#6b7280";
        if (!catMap[catName]) catMap[catName] = { value: 0, color: catColor };
        catMap[catName].value += t.amount;
      });
      setCategoryPieData(
        Object.entries(catMap).map(([name, { value, color }]) => ({
          name,
          value,
          color,
        })),
      );
    } catch {
      // Silently handle – no API available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const applyFilters = () => {
    setLoading(true);
    loadData();
  };

  const clearFilters = () => {
    setFilterBank("");
    setFilterYear("");
    setFilterMonth("");
    setLoading(true);
    setTimeout(loadData, 0);
  };

  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-1">Resumo financeiro</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          icon={<Wallet className="w-6 h-6" />}
          label="Saldo Total"
          value={formatBRL(summary?.total_balance ?? 0)}
          gradient="from-[#007bff] to-blue-400"
        />
        <SummaryCard
          icon={<CreditCard className="w-6 h-6" />}
          label="Limite Total"
          value={formatBRL(summary?.total_credit_limit ?? 0)}
          gradient="from-purple-500 to-pink-500"
        />
        <SummaryCard
          icon={<TrendingDown className="w-6 h-6" />}
          label="Crédito Utilizado"
          value={formatBRL(summary?.total_credit_used ?? 0)}
          gradient="from-red-500 to-orange-500"
        />
        <SummaryCard
          icon={<ShieldCheck className="w-6 h-6" />}
          label="Crédito Disponível"
          value={formatBRL(summary?.total_credit_available ?? 0)}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Filters + Monthly Chart */}
      <div className="glass-panel rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading text-xl font-medium text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#007bff]" />
            Gastos Mensais
          </h3>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:border-[#007bff] outline-none"
          >
            <option value="">Todos os bancos</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:border-[#007bff] outline-none"
          >
            <option value="">Todos os anos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:border-[#007bff] outline-none"
          >
            <option value="">Todos os meses</option>
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <GlassButton size="sm" onClick={applyFilters}>
            Aplicar
          </GlassButton>
          <GlassButton size="sm" variant="secondary" onClick={clearFilters}>
            Limpar
          </GlassButton>
        </div>

        <div className="h-[350px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : monthlyData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                <YAxis stroke="rgba(255,255,255,0.3)" />
                <Tooltip
                  contentStyle={{
                    background: "rgba(5,10,20,0.95)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12,
                    color: "#fff",
                  }}
                  formatter={(value) => [formatBRL(Number(value)), "Total"]}
                />
                <Bar
                  dataKey="total"
                  fill="#007bff"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={60}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <DollarSign className="w-8 h-8 mr-2 opacity-30" />
              Nenhuma transação encontrada
            </div>
          )}
        </div>
      </div>

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Card */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-heading text-xl font-medium text-white mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#007bff]" />
            Gastos por Cartão
          </h3>
          <div className="h-[300px]">
            {cardPieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cardPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {cardPieData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(5,10,20,0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                    formatter={(value) => formatBRL(Number(value))}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Sem dados
              </div>
            )}
          </div>
        </div>

        {/* By Category */}
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-heading text-xl font-medium text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#007bff]" />
            Gastos por Categoria
          </h3>
          <div className="h-[300px]">
            {categoryPieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {categoryPieData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "rgba(5,10,20,0.95)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                    formatter={(value) => formatBRL(Number(value))}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Sem dados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Credit Limit per Bank */}
      {summary?.banks && summary.banks.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="font-heading text-xl font-medium text-white mb-6 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#007bff]" />
            Limite de Crédito por Banco
          </h3>
          <div className="space-y-4">
            {summary.banks.map((bank) =>
              bank.cards
                .filter((c) => c.type === "credit")
                .map((card) => {
                  const used = card.used_amount ?? 0;
                  const limit = card.limit_amount ?? 1;
                  const pct = Math.min((used / limit) * 100, 100);
                  return (
                    <div key={card.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/80">
                          {bank.name} — {card.name}
                        </span>
                        <span className="text-white/60">
                          {formatBRL(used)} / {formatBRL(limit)}
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            pct > 80
                              ? "bg-gradient-to-r from-red-500 to-orange-500"
                              : "bg-gradient-to-r from-[#007bff] to-cyan-400"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                }),
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  gradient: string;
}) {
  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 group">
      <div
        className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500`}
      >
        {icon}
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className="font-heading text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
