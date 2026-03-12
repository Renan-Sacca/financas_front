import { useEffect, useState, useCallback, useRef } from "react";
import { summaryApi, banksApi, categoriesApi, cardsApi } from "@/services/api";
import type { FinancialSummary, Bank, Category, Card } from "@/types";
import { useDashboardCache } from "@/hooks/useDashboardCache";
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
  Loader2,
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

const selectClass =
  "bg-[#0d1b2a] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:border-[#007bff] outline-none w-full";
const inputClass =
  "bg-[#0d1b2a] border border-white/10 text-white text-sm rounded-lg px-3 py-2 w-full focus:border-[#007bff] outline-none";

const tooltipStyle = {
  background: "rgba(5,10,20,0.95)",
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 12,
  color: "#fff",
};

// Helper functions for date ranges
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

const getLast6MonthsRange = () => {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return {
    from: startDate.toISOString().split("T")[0],
    to: endDate.toISOString().split("T")[0],
  };
};

export default function DashboardPage() {
  const { cache, updateMultiple, shouldRefetch } = useDashboardCache();
  const initialLoadDone = useRef(false);

  // Global Data - initialize from cache
  const [summary, setSummary] = useState<FinancialSummary | null>(cache.summary);
  const [banks, setBanks] = useState<Bank[]>(cache.banks);
  const [cards, setCards] = useState<Card[]>(cache.cards);
  const [categories, setCategories] = useState<Category[]>(cache.categories);
  const [globalLoading, setGlobalLoading] = useState(!cache.lastFetch);

  // Gastos Mensais State - initialize from cache
  const [monthlyBank, setMonthlyBank] = useState(cache.monthlyFilters.bank);
  const [monthlyCard, setMonthlyCard] = useState(cache.monthlyFilters.card);
  const [monthlyYear, setMonthlyYear] = useState(cache.monthlyFilters.year);
  const [monthlyMonth, setMonthlyMonth] = useState(cache.monthlyFilters.month);
  const [monthlyCategory, setMonthlyCategory] = useState(cache.monthlyFilters.category);
  const [monthlyData, setMonthlyData] = useState<{ name: string; total: number }[]>(cache.monthlyData);
  const [loadingMonthly, setLoadingMonthly] = useState(false);

  // Gastos por Cartão State - initialize from cache or current month
  const [cardPieBank, setCardPieBank] = useState(cache.cardPieFilters.bank);
  const [cardDateFrom, setCardDateFrom] = useState(() => cache.cardPieFilters.dateFrom || getCurrentMonthRange().from);
  const [cardDateTo, setCardDateTo] = useState(() => cache.cardPieFilters.dateTo || getCurrentMonthRange().to);
  const [cardPieData, setCardPieData] = useState<{ name: string; value: number }[]>(cache.cardPieData);
  const [loadingCardPie, setLoadingCardPie] = useState(false);

  // Gastos por Categoria State - initialize from cache or current month
  const [catPieBank, setCatPieBank] = useState(cache.catPieFilters.bank);
  const [catDateFrom, setCatDateFrom] = useState(() => cache.catPieFilters.dateFrom || getCurrentMonthRange().from);
  const [catDateTo, setCatDateTo] = useState(() => cache.catPieFilters.dateTo || getCurrentMonthRange().to);
  const [catPieData, setCatPieData] = useState<{ name: string; value: number; color: string }[]>(cache.catPieData);
  const [loadingCatPie, setLoadingCatPie] = useState(false);

  // Limite de Crédito State - initialize from cache
  const [creditBank, setCreditBank] = useState(cache.creditFilters.bank);
  const [creditLimitData, setCreditLimitData] = useState<{
    card_name: string;
    bank_name: string;
    total_limit: number;
    used_limit: number;
    available_limit: number;
  }[]>(cache.creditLimitData);
  const [loadingCredit, setLoadingCredit] = useState(false);

  // Functions to load data
  const loadGlobal = useCallback(async () => {
    try {
      const [sumRes, bankRes, cardRes, catRes] = await Promise.all([
        summaryApi.get().catch(() => null),
        banksApi.list().catch(() => []),
        cardsApi.list().catch(() => []),
        categoriesApi.list().catch(() => []),
      ]);
      if (sumRes) setSummary(sumRes);
      setBanks(bankRes);
      setCards(cardRes);
      setCategories(catRes);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  const fetchMonthlyChart = useCallback(async () => {
    setLoadingMonthly(true);
    try {
      const params: Record<string, string> = {};
      if (monthlyBank) params.bank_id = monthlyBank;
      if (monthlyCard) params.card_id = monthlyCard;
      if (monthlyCategory) params.category_id = monthlyCategory;
      if (monthlyYear) params.year = monthlyYear;
      if (monthlyMonth) params.month = monthlyMonth;
      
      // If no filters, default to last 6 months
      if (!monthlyYear && !monthlyMonth) {
        const last6Months = getLast6MonthsRange();
        params.date_from = last6Months.from;
        params.date_to = last6Months.to;
      }

      const raw = await summaryApi.getMonthlyExpenses(params).catch(() => []);
      // Limit to last 6 months of data
      const limitedData = raw.slice(-6);
      setMonthlyData(limitedData.map((d) => ({ name: d.month, total: d.total })));
    } finally {
      setLoadingMonthly(false);
    }
  }, [monthlyBank, monthlyCard, monthlyCategory, monthlyYear, monthlyMonth]);

  const fetchCardPie = useCallback(async () => {
    setLoadingCardPie(true);
    try {
      const params: Record<string, string> = {};
      if (cardPieBank) params.bank_id = cardPieBank;
      if (cardDateFrom) params.date_from = cardDateFrom;
      if (cardDateTo) params.date_to = cardDateTo;

      const raw = await summaryApi.getCardExpenses(params).catch(() => []);
      setCardPieData(raw.map((d) => ({ name: d.card || "Sem cartão", value: d.total })));
    } finally {
      setLoadingCardPie(false);
    }
  }, [cardPieBank, cardDateFrom, cardDateTo]);

  const fetchCatPie = useCallback(async () => {
    setLoadingCatPie(true);
    try {
      const params: Record<string, string> = {};
      if (catPieBank) params.bank_id = catPieBank;
      if (catDateFrom) params.date_from = catDateFrom;
      if (catDateTo) params.date_to = catDateTo;

      const raw = await summaryApi.getCategoryExpenses(params).catch(() => []);
      setCatPieData(
        raw.map((d, i) => ({
          name: d.category || "Sem categoria",
          value: d.total,
          color: d.color || CHART_COLORS[i % CHART_COLORS.length],
        }))
      );
    } finally {
      setLoadingCatPie(false);
    }
  }, [catPieBank, catDateFrom, catDateTo]);

  const fetchCreditLimits = useCallback(async () => {
    setLoadingCredit(true);
    try {
      const params: Record<string, string> = {};
      if (creditBank) params.bank_id = creditBank;

      const raw = await summaryApi.getCreditLimits(params).catch(() => []);
      setCreditLimitData(raw);
    } finally {
      setLoadingCredit(false);
    }
  }, [creditBank]);

  // Initial load - only fetch if cache is invalidated
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    // If we have cached data and shouldn't refetch, skip loading
    if (!shouldRefetch() && cache.lastFetch) {
      setGlobalLoading(false);
      return;
    }

    loadGlobal().then(() => {
      fetchMonthlyChart();
      fetchCardPie();
      fetchCatPie();
      fetchCreditLimits();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to cache whenever data changes
  useEffect(() => {
    if (globalLoading) return;
    updateMultiple({
      summary,
      banks,
      cards,
      categories,
      monthlyData,
      cardPieData,
      catPieData,
      creditLimitData,
      monthlyFilters: { bank: monthlyBank, card: monthlyCard, year: monthlyYear, month: monthlyMonth, category: monthlyCategory },
      cardPieFilters: { bank: cardPieBank, dateFrom: cardDateFrom, dateTo: cardDateTo },
      catPieFilters: { bank: catPieBank, dateFrom: catDateFrom, dateTo: catDateTo },
      creditFilters: { bank: creditBank },
    });
  }, [summary, banks, cards, categories, monthlyData, cardPieData, catPieData, creditLimitData, globalLoading]);

  const monthsList = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const yearsList = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  // Removed client-side credit limits filter (now fetching from API automatically)

  if (globalLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <span className="w-8 h-8 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl font-semibold text-white tracking-tight">Dashboard</h1>
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
          label="Crédito Disp."
          value={formatBRL(summary?.total_credit_available ?? 0)}
          gradient="from-emerald-500 to-teal-500"
        />
      </div>

      {/* Gastos Mensais */}
      <div className="glass-panel rounded-2xl p-6" style={{ overflow: "visible" }}>
        <h3 className="font-heading text-xl font-medium text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#007bff]" /> Gastos Mensais
        </h3>
        <div className="flex flex-wrap gap-4 mb-6 items-end">
          <div className="w-full sm:w-auto flex-1 md:flex-none min-w-[140px]">
            <label className="block text-xs text-gray-400 mb-1">Banco</label>
            <select value={monthlyBank} onChange={(e) => setMonthlyBank(e.target.value)} className={selectClass}>
              <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todos os bancos</option>
              {banks.map((b) => <option key={b.id} value={b.id} style={{ background: "#0d1b2a", color: "white" }}>{b.name}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto flex-1 md:flex-none min-w-[140px]">
            <label className="block text-xs text-gray-400 mb-1">Cartão</label>
            <select value={monthlyCard} onChange={(e) => setMonthlyCard(e.target.value)} className={selectClass}>
              <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todos os cartões</option>
              {cards.filter(c => !monthlyBank || c.bank_id.toString() === monthlyBank).map((c) => (
                <option key={c.id} value={c.id} style={{ background: "#0d1b2a", color: "white" }}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-auto flex-1 md:flex-none min-w-[140px]">
            <label className="block text-xs text-gray-400 mb-1">Ano</label>
            <select value={monthlyYear} onChange={(e) => setMonthlyYear(e.target.value)} className={selectClass}>
              <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todos os anos</option>
              {yearsList.map((y) => <option key={y} value={y} style={{ background: "#0d1b2a", color: "white" }}>{y}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto flex-1 md:flex-none min-w-[140px]">
            <label className="block text-xs text-gray-400 mb-1">Mês</label>
            <select value={monthlyMonth} onChange={(e) => setMonthlyMonth(e.target.value)} className={selectClass}>
              <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todos os meses</option>
              {monthsList.map((m, i) => <option key={i} value={i + 1} style={{ background: "#0d1b2a", color: "white" }}>{m}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto flex-1 md:flex-none min-w-[140px]">
            <label className="block text-xs text-gray-400 mb-1">Categoria</label>
            <select value={monthlyCategory} onChange={(e) => setMonthlyCategory(e.target.value)} className={selectClass}>
              <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todas</option>
              {categories.map((c) => <option key={c.id} value={c.id} style={{ background: "#0d1b2a", color: "white" }}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <GlassButton size="sm" onClick={fetchMonthlyChart}>Aplicar</GlassButton>
            <GlassButton size="sm" variant="secondary" onClick={() => {
              setMonthlyBank(""); setMonthlyCard(""); setMonthlyYear(""); setMonthlyMonth(""); setMonthlyCategory("");
              setTimeout(() => { document.getElementById("hidden-trigger-monthly")?.click(); }, 0);
            }}>Limpar</GlassButton>
            <button id="hidden-trigger-monthly" className="hidden" onClick={fetchMonthlyChart} />
          </div>
        </div>

        {loadingMonthly && monthlyData.length === 0 ? (
          <div className="h-[350px] flex justify-center items-center"><span className="w-6 h-6 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" /></div>
        ) : monthlyData.length ? (
          <div style={{ width: "100%", height: 350, overflow: "visible" }} className="relative">
            {loadingMonthly && (
              <div className="absolute top-2 right-2 z-10">
                <Loader2 className="w-4 h-4 text-[#007bff] animate-spin" />
              </div>
            )}
            <ResponsiveContainer width="99%" height={350}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" />
                <YAxis stroke="rgba(255,255,255,0.3)" />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={tooltipStyle} formatter={(v) => [formatBRL(Number(v)), "Total"]} />
                <Bar dataKey="total" fill="#007bff" radius={[8, 8, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <div className="h-[350px] flex items-center justify-center text-gray-500">Nenhuma transação encontrada</div>}
      </div>


      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gastos por Cartão */}
        <div className="glass-panel rounded-2xl p-6" style={{ overflow: "visible" }}>
          <h3 className="font-heading text-xl font-medium text-white mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#007bff]" /> Gastos por Cartão
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Banco</label>
              <select value={cardPieBank} onChange={(e) => setCardPieBank(e.target.value)} className={selectClass}>
                <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todos</option>
                {banks.map((b) => <option key={b.id} value={b.id} style={{ background: "#0d1b2a", color: "white" }}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input type="date" value={cardDateFrom} onChange={e => setCardDateFrom(e.target.value)} className={inputClass} style={{ colorScheme: "dark" }} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input type="date" value={cardDateTo} onChange={e => setCardDateTo(e.target.value)} className={inputClass} style={{ colorScheme: "dark" }} />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <GlassButton size="sm" onClick={fetchCardPie}>Aplicar</GlassButton>
              <GlassButton size="sm" variant="secondary" onClick={() => {
                const currentMonth = getCurrentMonthRange();
                setCardPieBank(""); setCardDateFrom(currentMonth.from); setCardDateTo(currentMonth.to);
                setTimeout(() => { document.getElementById("hidden-trigger-card")?.click(); }, 0);
              }}>Limpar</GlassButton>
              <button id="hidden-trigger-card" className="hidden" onClick={fetchCardPie} />
            </div>
          </div>
          {loadingCardPie && cardPieData.length === 0 ? (
            <div className="h-[300px] flex justify-center items-center"><span className="w-6 h-6 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" /></div>
          ) : cardPieData.length ? (
            <>
              <div style={{ width: "100%", height: 300, overflow: "visible" }} className="relative">
                {loadingCardPie && (
                  <div className="absolute top-2 right-2 z-10">
                    <Loader2 className="w-4 h-4 text-[#007bff] animate-spin" />
                  </div>
                )}
                <ResponsiveContainer width="99%" height={300}>
                  <PieChart>
                    <Pie data={cardPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={{ stroke: "rgba(255,255,255,0.3)" }}>
                      {cardPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(Number(v))} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <span className="text-sm text-gray-400">Total: </span>
                <span className="text-lg font-semibold text-white">{formatBRL(cardPieData.reduce((acc, d) => acc + d.value, 0))}</span>
              </div>
            </>
          ) : <div className="h-[300px] flex items-center justify-center text-gray-500">Sem dados</div>}
        </div>

        {/* Gastos por Categoria */}
        <div className="glass-panel rounded-2xl p-6" style={{ overflow: "visible" }}>
          <h3 className="font-heading text-xl font-medium text-white mb-6 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#007bff]" /> Gastos por Categoria
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Banco</label>
              <select value={catPieBank} onChange={(e) => setCatPieBank(e.target.value)} className={selectClass}>
                <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todos</option>
                {banks.map((b) => <option key={b.id} value={b.id} style={{ background: "#0d1b2a", color: "white" }}>{b.name}</option>)}
              </select>
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Data Início</label>
              <input type="date" value={catDateFrom} onChange={e => setCatDateFrom(e.target.value)} className={inputClass} style={{ colorScheme: "dark" }} />
            </div>
            <div className="col-span-1">
              <label className="block text-xs text-gray-400 mb-1">Data Fim</label>
              <input type="date" value={catDateTo} onChange={e => setCatDateTo(e.target.value)} className={inputClass} style={{ colorScheme: "dark" }} />
            </div>
            <div className="col-span-2 flex gap-2 justify-end">
              <GlassButton size="sm" onClick={fetchCatPie}>Aplicar</GlassButton>
              <GlassButton size="sm" variant="secondary" onClick={() => {
                const currentMonth = getCurrentMonthRange();
                setCatPieBank(""); setCatDateFrom(currentMonth.from); setCatDateTo(currentMonth.to);
                setTimeout(() => { document.getElementById("hidden-trigger-cat")?.click(); }, 0);
              }}>Limpar</GlassButton>
              <button id="hidden-trigger-cat" className="hidden" onClick={fetchCatPie} />
            </div>
          </div>
          {loadingCatPie && catPieData.length === 0 ? (
            <div className="h-[300px] flex justify-center items-center"><span className="w-6 h-6 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" /></div>
          ) : catPieData.length ? (
            <>
              <div style={{ width: "100%", height: 300, overflow: "visible" }} className="relative">
                {loadingCatPie && (
                  <div className="absolute top-2 right-2 z-10">
                    <Loader2 className="w-4 h-4 text-[#007bff] animate-spin" />
                  </div>
                )}
                <ResponsiveContainer width="99%" height={300}>
                  <PieChart>
                    <Pie data={catPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`} labelLine={{ stroke: "rgba(255,255,255,0.3)" }}>
                      {catPieData.map((e, i) => <Cell key={i} fill={e.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatBRL(Number(v))} />
                    <Legend wrapperStyle={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 text-center">
                <span className="text-sm text-gray-400">Total: </span>
                <span className="text-lg font-semibold text-white">{formatBRL(catPieData.reduce((acc, d) => acc + d.value, 0))}</span>
              </div>
            </>
          ) : <div className="h-[300px] flex items-center justify-center text-gray-500">Sem dados</div>}
        </div>
      </div>

      {/* Credit Limit per Bank */}
      <div className="glass-panel rounded-2xl p-6">
        <h3 className="font-heading text-xl font-medium text-white mb-6 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#007bff]" /> Limite de Crédito
        </h3>
        <div className="flex gap-4 mb-6 items-end">
          <div className="flex-1 max-w-[300px]">
            <label className="block text-xs text-gray-400 mb-1">Banco</label>
            <select value={creditBank} onChange={(e) => setCreditBank(e.target.value)} className={selectClass}>
              <option value="" style={{ background: "#0d1b2a", color: "white" }}>Todos os bancos</option>
              {banks.map((b) => <option key={b.id} value={b.id} style={{ background: "#0d1b2a", color: "white" }}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <GlassButton size="sm" onClick={fetchCreditLimits}>Aplicar</GlassButton>
            <GlassButton size="sm" variant="secondary" onClick={() => {
              setCreditBank("");
              setTimeout(() => { document.getElementById("hidden-trigger-credit")?.click(); }, 0);
            }}>Limpar</GlassButton>
            <button id="hidden-trigger-credit" className="hidden" onClick={fetchCreditLimits} />
          </div>
        </div>

        {loadingCredit && creditLimitData.length === 0 ? (
          <div className="py-8 flex justify-center items-center"><span className="w-6 h-6 border-2 border-[#007bff] border-t-transparent rounded-full animate-spin" /></div>
        ) : creditLimitData.length > 0 ? (
          <div className="space-y-4 relative">
            {loadingCredit && (
              <div className="absolute top-0 right-0 z-10">
                <Loader2 className="w-4 h-4 text-[#007bff] animate-spin" />
              </div>
            )}
            {creditLimitData.map((card, idx) => {
              const used = card.used_limit;
              const limit = card.total_limit;
              const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/80">{card.bank_name ? `${card.bank_name} — ` : ""}{card.card_name}</span>
                    <span className="text-white/60">{formatBRL(used)} / {formatBRL(limit)}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${pct > 80 ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-[#007bff] to-cyan-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <div className="text-center text-gray-500 py-8">Nenhum cartão encontrado</div>}
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, gradient }: { icon: React.ReactNode; label: string; value: string; gradient: string }) {
  return (
    <div className="glass-panel glass-panel-hover rounded-2xl p-6 group">
      <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
        {icon}
      </div>
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="font-heading text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
