import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Bot, User, Send, Trash2, ArrowLeft, Upload, FileText } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const HISTORY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_KEY = "chat_session_id";
const SESSION_TS_KEY = "chat_session_ts";

// ── session ───────────────────────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  const now = Date.now();
  const ts = Number(localStorage.getItem(SESSION_TS_KEY) || "0");
  if (now - ts > HISTORY_TTL_MS) return newSession();
  return localStorage.getItem(SESSION_KEY) || newSession();
}
function newSession(): string {
  const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem(SESSION_KEY, id);
  localStorage.setItem(SESSION_TS_KEY, String(Date.now()));
  return id;
}
function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}
function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── tipos ─────────────────────────────────────────────────────────────────────
interface QuickReply {
  label: string;
  value: string;
}

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  quickReplies?: QuickReply[];
  fileName?: string;
  isUpload?: boolean;
}

// Estado do fluxo conversacional
interface FlowState {
  block: string;
  step: string;
  data: Record<string, unknown>;
}

// ── fluxos por bloco ──────────────────────────────────────────────────────────
const MAIN_MENU: QuickReply[] = [
  { label: "🏦 Banco", value: "bank" },
  { label: "💳 Cartão", value: "card" },
  { label: "🛒 Gastos", value: "transaction" },
  { label: "💰 Depósito", value: "deposit" },
  { label: "📄 Extrato Fatura", value: "statement_card" },
  { label: "🏛️ Extrato Banco", value: "statement_bank" },
  { label: "💬 Compra Livre", value: "free" },
];

const BANK_MENU: QuickReply[] = [
  { label: "➕ Criar banco", value: "create" },
  { label: "✏️ Alterar saldo", value: "update_balance" },
  { label: "📋 Listar bancos", value: "list" },
];

const CARD_MENU: QuickReply[] = [
  { label: "➕ Criar cartão", value: "create" },
  { label: "✏️ Editar cartão", value: "edit" },
  { label: "📋 Listar cartões", value: "list" },
  { label: "💳 Ver limites", value: "limit" },
];

const CARD_TYPE_MENU: QuickReply[] = [
  { label: "💳 Crédito", value: "credit" },
  { label: "🏧 Débito", value: "debit" },
];

const YES_NO: QuickReply[] = [
  { label: "✅ Sim", value: "sim" },
  { label: "❌ Não", value: "nao" },
];

const BACK: QuickReply[] = [{ label: "🔙 Voltar ao menu", value: "__menu__" }];

// ── helpers de fetch ──────────────────────────────────────────────────────────
async function fetchBanks(): Promise<QuickReply[]> {
  try {
    const res = await fetch(`${API_URL}/banks`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data: { id: number; name: string; current_balance: number }[] = await res.json();
    return data.map(b => ({ label: `🏦 ${b.name} (R$ ${b.current_balance.toFixed(2)})`, value: `bank_id:${b.id}` }));
  } catch { return []; }
}

async function fetchCards(): Promise<QuickReply[]> {
  try {
    const res = await fetch(`${API_URL}/cards`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data: { id: number; name: string; type: string; limit_amount?: number }[] = await res.json();
    return data.map(c => ({
      label: `💳 ${c.name} (${c.type === "credit" ? "Crédito" : "Débito"})`,
      value: `card_id:${c.id}`,
    }));
  } catch { return []; }
}

// Renderiza texto com URLs como links clicáveis
function MessageText({ text }: { text: string }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return (
    <span className="whitespace-pre-wrap">
      {parts.map((part, i) =>
        urlRegex.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            className="text-[#60a5fa] underline underline-offset-2 hover:text-white transition-colors break-all">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [inputEnabled, setInputEnabled] = useState(false);
  const [inputPlaceholder, setInputPlaceholder] = useState("Selecione uma opção acima...");
  const [loading, setLoading] = useState(false);
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [sessionId, setSessionId] = useState(getOrCreateSessionId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputEnabled) inputRef.current?.focus();
  }, [isOpen, inputEnabled]);

  // Adicionar mensagem ao chat
  const addMsg = useCallback((
    text: string,
    sender: "user" | "bot",
    opts?: { quickReplies?: QuickReply[]; fileName?: string; isUpload?: boolean }
  ) => {
    setMessages(prev => [...prev, {
      id: nextId.current++,
      text, sender,
      quickReplies: opts?.quickReplies,
      fileName: opts?.fileName,
      isUpload: opts?.isUpload,
    }]);
  }, []);

  // Mostrar menu principal
  const showMainMenu = useCallback(() => {
    setFlow(null);
    setInputEnabled(false);
    setInputPlaceholder("Selecione uma opção acima...");
    addMsg("O que você quer fazer?", "bot", { quickReplies: MAIN_MENU });
  }, [addMsg]);

  // Inicializar chat
  useEffect(() => {
    if (!isOpen) return;
    if (messages.length > 0) return;

    const token = getToken();
    if (token) {
      fetch(`${API_URL}/chat/history/${sessionId}`, { headers: authHeaders() })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.messages?.length) {
            const loaded: Message[] = data.messages.map((m: { role: string; text: string }) => ({
              id: nextId.current++,
              text: m.text,
              sender: m.role === "user" ? "user" as const : "bot" as const,
            }));
            setMessages(loaded);
            // Mostrar menu após histórico
            setTimeout(() => {
              addMsg("Bem-vindo de volta! O que você quer fazer?", "bot", { quickReplies: MAIN_MENU });
            }, 100);
          } else {
            addMsg("Olá! Sou o assistente financeiro. O que você quer fazer?", "bot", { quickReplies: MAIN_MENU });
          }
        })
        .catch(() => {
          addMsg("Olá! Sou o assistente financeiro. O que você quer fazer?", "bot", { quickReplies: MAIN_MENU });
        });
    } else {
      addMsg("Olá! Sou o assistente financeiro. O que você quer fazer?", "bot", { quickReplies: MAIN_MENU });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Limpar histórico
  const handleClear = async () => {
    await fetch(`${API_URL}/chat/history/${sessionId}`, {
      method: "DELETE", headers: authHeaders(),
    }).catch(() => {});
    const id = newSession();
    setSessionId(id);
    setMessages([]);
    setFlow(null);
    setInput("");
    setInputEnabled(false);
    setInputPlaceholder("Selecione uma opção acima...");
    setTimeout(() => {
      addMsg("Histórico limpo. O que você quer fazer?", "bot", { quickReplies: MAIN_MENU });
    }, 50);
  };

  // ── processar quick reply ───────────────────────────────────────────────────
  const handleQuickReply = async (value: string, label: string) => {
    if (loading) return;

    if (value === "__menu__") {
      addMsg(label, "user");
      showMainMenu();
      return;
    }

    // Menu principal — escolha de bloco
    if (!flow) {
      addMsg(label, "user");
      await startBlock(value);
      return;
    }

    // Dentro de um fluxo
    addMsg(label, "user");
    await advanceFlow(value, label);
  };

  // ── iniciar bloco ───────────────────────────────────────────────────────────
  const startBlock = async (block: string) => {
    switch (block) {
      case "bank":
        setFlow({ block: "bank", step: "menu", data: {} });
        addMsg("Banco — o que você quer fazer?", "bot", { quickReplies: [...BANK_MENU, ...BACK] });
        break;
      case "card":
        setFlow({ block: "card", step: "menu", data: {} });
        addMsg("Cartão — o que você quer fazer?", "bot", { quickReplies: [...CARD_MENU, ...BACK] });
        break;
      case "transaction": {
        setFlow({ block: "transaction", step: "pick_card", data: {} });
        setInputEnabled(false);
        setInputPlaceholder("Selecione uma opção...");
        const txCards = await fetchCards();
        if (txCards.length === 0) {
          addMsg("Nenhum cartão cadastrado. Cadastre um cartão primeiro.", "bot", { quickReplies: MAIN_MENU });
          setFlow(null);
        } else {
          addMsg("Em qual cartão foi o gasto?", "bot", { quickReplies: [...txCards, ...BACK] });
        }
        break;
      }
      case "deposit": {
        setFlow({ block: "deposit", step: "pick_bank", data: {} });
        setInputEnabled(false);
        setInputPlaceholder("Selecione uma opção...");
        const depBanks = await fetchBanks();
        if (depBanks.length === 0) {
          addMsg("Nenhum banco cadastrado. Cadastre um banco primeiro.", "bot", { quickReplies: MAIN_MENU });
          setFlow(null);
        } else {
          addMsg("Em qual banco deseja depositar?", "bot", { quickReplies: [...depBanks, ...BACK] });
        }
        break;
      }
      case "statement_card": {
        // Buscar cartões de crédito para seleção
        const stCards = await fetchCards();
        const creditCards = stCards.filter(c => c.label.includes("Crédito"));
        if (creditCards.length === 0) {
          addMsg("Nenhum cartão de crédito cadastrado.", "bot", { quickReplies: MAIN_MENU });
          break;
        }
        setFlow({ block: "statement_card", step: "pick_card", data: {} });
        setInputEnabled(false);
        setInputPlaceholder("Selecione o cartão...");
        addMsg("De qual cartão é esta fatura?", "bot", { quickReplies: [...creditCards, ...BACK] });
        break;
      }
      case "statement_bank":
        setFlow({ block: "statement_bank", step: "upload", data: {} });
        setInputEnabled(false);
        setInputPlaceholder("Selecione o arquivo acima...");
        addMsg("Envie o arquivo PDF ou CSV do extrato bancário.", "bot", {
          quickReplies: BACK,
          isUpload: true,
        });
        break;
      case "free":
        setFlow({ block: "free", step: "message", data: {} });
        setInputEnabled(true);
        setInputPlaceholder("Ex: gastei 50 reais no mercado hoje no nubank...");
        addMsg("Descreva a compra do seu jeito que eu interpreto e registro.", "bot", { quickReplies: BACK });
        break;
    }
  };

  // ── avançar fluxo com quick reply ───────────────────────────────────────────
  const advanceFlow = async (value: string, _label: string) => {
    if (!flow) return;

    // BANCO
    if (flow.block === "bank") {
      if (flow.step === "menu") {
        if (value === "list") {
          await callBankApi({ action: "list" });
          return;
        }
        if (value === "create") {
          setFlow({ ...flow, step: "name", data: { action: "create" } });
          setInputEnabled(true);
          setInputPlaceholder("Nome do banco...");
          addMsg("Qual o nome do banco?", "bot", { quickReplies: BACK });
          return;
        }
        if (value === "update_balance") {
          const banks = await fetchBanks();
          if (banks.length === 0) {
            addMsg("Nenhum banco cadastrado.", "bot", { quickReplies: [...BANK_MENU, ...BACK] });
            return;
          }
          setFlow({ ...flow, step: "pick_bank_balance", data: { action: "update_balance" } });
          setInputEnabled(false);
          setInputPlaceholder("Selecione o banco...");
          addMsg("Qual banco deseja alterar o saldo?", "bot", { quickReplies: [...banks, ...BACK] });
          return;
        }
      }
      if (flow.step === "pick_bank_balance" && value.startsWith("bank_id:")) {
        const bankId = parseInt(value.split(":")[1]);
        setFlow({ ...flow, step: "new_balance", data: { ...flow.data, bank_id: bankId } });
        setInputEnabled(true);
        setInputPlaceholder("Novo saldo em R$...");
        addMsg("Qual o novo saldo?", "bot", { quickReplies: BACK });
        return;
      }
    }

    // CARTÃO
    if (flow.block === "card") {
      if (flow.step === "menu") {
        if (value === "list") { await callCardApi({ action: "list" }); return; }
        if (value === "limit") { await callCardApi({ action: "limit" }); return; }
        if (value === "create") {
          const banks = await fetchBanks();
          if (banks.length === 0) {
            addMsg("Nenhum banco cadastrado. Cadastre um banco primeiro.", "bot", { quickReplies: [...CARD_MENU, ...BACK] });
            return;
          }
          setFlow({ ...flow, step: "pick_bank_card", data: { action: "create" } });
          setInputEnabled(false);
          setInputPlaceholder("Selecione o banco...");
          addMsg("Em qual banco ficará este cartão?", "bot", { quickReplies: [...banks, ...BACK] });
          return;
        }
        if (value === "edit") {
          const cards = await fetchCards();
          if (cards.length === 0) {
            addMsg("Nenhum cartão cadastrado.", "bot", { quickReplies: [...CARD_MENU, ...BACK] });
            return;
          }
          setFlow({ ...flow, step: "pick_card_edit", data: { action: "edit" } });
          setInputEnabled(false);
          setInputPlaceholder("Selecione o cartão...");
          addMsg("Qual cartão deseja editar?", "bot", { quickReplies: [...cards, ...BACK] });
          return;
        }
      }
      if (flow.step === "pick_bank_card" && value.startsWith("bank_id:")) {
        const bankId = parseInt(value.split(":")[1]);
        setFlow({ ...flow, step: "name", data: { ...flow.data, bank_id: bankId } });
        setInputEnabled(true);
        setInputPlaceholder("Nome do cartão...");
        addMsg("Qual o nome do cartão?", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "pick_card_edit" && value.startsWith("card_id:")) {
        const cardId = parseInt(value.split(":")[1]);
        setFlow({ ...flow, step: "edit_name", data: { ...flow.data, card_id: cardId } });
        setInputEnabled(true);
        setInputPlaceholder("Novo nome (ou deixe em branco para manter)...");
        addMsg("Novo nome do cartão? (deixe em branco para manter)", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "card_type") {
        const updated = { ...flow.data, card_type: value };
        setFlow({ ...flow, step: "limit", data: updated });
        setInputEnabled(true);
        setInputPlaceholder("Limite em R$ (ou deixe em branco)...");
        addMsg("Qual o limite do cartão? (deixe em branco para pular)", "bot", { quickReplies: BACK });
        return;
      }
    }

    // EXTRATO CARTÃO — pick de cartão → vai para upload
    if (flow.block === "statement_card" && flow.step === "pick_card" && value.startsWith("card_id:")) {
      const cardId = parseInt(value.split(":")[1]);
      setFlow({ ...flow, step: "upload", data: { card_id: cardId } });
      setInputEnabled(false);
      setInputPlaceholder("Selecione o arquivo acima...");
      addMsg("Agora envie o arquivo PDF ou CSV da fatura.", "bot", { quickReplies: BACK, isUpload: true });
      return;
    }

    // GASTO — pick de cartão
    if (flow.block === "transaction" && flow.step === "pick_card" && value.startsWith("card_id:")) {
      const cardId = parseInt(value.split(":")[1]);
      setFlow({ ...flow, step: "description", data: { card_id: cardId } });
      setInputEnabled(true);
      setInputPlaceholder("Descrição do gasto...");
      addMsg("Qual a descrição do gasto?", "bot", { quickReplies: BACK });
      return;
    }

    // DEPÓSITO — pick de banco
    if (flow.block === "deposit" && flow.step === "pick_bank" && value.startsWith("bank_id:")) {
      const bankId = parseInt(value.split(":")[1]);
      setFlow({ ...flow, step: "amount", data: { bank_id: bankId } });
      setInputEnabled(true);
      setInputPlaceholder("Valor em R$...");
      addMsg("Qual o valor do depósito?", "bot", { quickReplies: BACK });
      return;
    }

    // GASTO — confirmação de parcelas
    if (flow.block === "transaction" && flow.step === "confirm_installments") {
      if (value === "sim") {
        setFlow({ ...flow, step: "installments" });
        setInputEnabled(true);
        setInputPlaceholder("Número de parcelas...");
        addMsg("Quantas parcelas?", "bot", { quickReplies: BACK });
      } else {
        await submitTransaction({ ...flow.data, total_installments: 1 });
      }
      return;
    }

    // DEPÓSITO — confirmação de adicionar ao saldo
    if (flow.block === "deposit" && flow.step === "confirm_balance") {
      await submitDeposit({ ...flow.data, add_to_balance: value === "sim" });
      return;
    }
  };

  // ── processar input de texto ────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !inputEnabled || loading) return;
    setInput("");
    addMsg(text, "user");
    await processTextInput(text);
  };

  const processTextInput = async (text: string) => {
    if (!flow) return;

    // BANCO
    if (flow.block === "bank") {
      if (flow.step === "name") {
        const updated = { ...flow.data, name: text };
        setFlow({ ...flow, step: "balance", data: updated });
        setInputPlaceholder("Saldo inicial em R$ (ou 0)...");
        addMsg("Qual o saldo inicial? (ex: 1500.00)", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "balance") {
        await callBankApi({ ...flow.data, balance: parseFloat(text) || 0 });
        return;
      }
      if (flow.step === "new_balance") {
        await callBankApi({ ...flow.data, balance: parseFloat(text) });
        return;
      }
    }

    // CARTÃO
    if (flow.block === "card") {
      if (flow.step === "name" && flow.data.action === "create") {
        const updated = { ...flow.data, name: text };
        setFlow({ ...flow, step: "card_type", data: updated });
        setInputEnabled(false);
        setInputPlaceholder("Selecione o tipo...");
        addMsg("Qual o tipo do cartão?", "bot", { quickReplies: [...CARD_TYPE_MENU, ...BACK] });
        return;
      }
      if (flow.step === "limit") {
        const updated = { ...flow.data, limit_amount: text ? parseFloat(text) : undefined };
        setFlow({ ...flow, step: "due_day", data: updated });
        setInputPlaceholder("Dia de vencimento (1-31, ou deixe em branco)...");
        addMsg("Qual o dia de vencimento? (deixe em branco para pular)", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "due_day") {
        await callCardApi({ ...flow.data, due_day: text ? parseInt(text) : undefined });
        return;
      }
      if (flow.step === "edit_limit") {
        await callCardApi({ ...flow.data, limit_amount: text ? parseFloat(text) : undefined });
        return;
      }
    }

    // GASTO
    if (flow.block === "transaction") {
      if (flow.step === "description") {
        const updated = { ...flow.data, description: text };
        setFlow({ ...flow, step: "amount", data: updated });
        setInputPlaceholder("Valor em R$...");
        addMsg("Qual o valor?", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "amount") {
        const updated = { ...flow.data, amount: parseFloat(text) };
        setFlow({ ...flow, step: "date", data: updated });
        setInputPlaceholder("Data (AAAA-MM-DD ou deixe em branco para hoje)...");
        addMsg("Qual a data da compra? (deixe em branco para hoje)", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "date") {
        const date = text || new Date().toISOString().slice(0, 10);
        const updated = { ...flow.data, date };
        setFlow({ ...flow, step: "confirm_installments", data: updated });
        setInputEnabled(false);
        setInputPlaceholder("Selecione uma opção...");
        addMsg("É uma compra parcelada?", "bot", { quickReplies: [...YES_NO, ...BACK] });
        return;
      }
      if (flow.step === "installments") {
        await submitTransaction({ ...flow.data, total_installments: parseInt(text) });
        return;
      }
    }

    // DEPÓSITO
    if (flow.block === "deposit") {
      if (flow.step === "amount") {
        const updated = { ...flow.data, amount: parseFloat(text) };
        setFlow({ ...flow, step: "description", data: updated });
        setInputPlaceholder("Descrição (ou deixe em branco)...");
        addMsg("Qual a descrição? (deixe em branco para pular)", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "description") {
        const updated = { ...flow.data, description: text || undefined };
        setFlow({ ...flow, step: "date", data: updated });
        setInputPlaceholder("Data (AAAA-MM-DD ou deixe em branco para hoje)...");
        addMsg("Qual a data? (deixe em branco para hoje)", "bot", { quickReplies: BACK });
        return;
      }
      if (flow.step === "date") {
        const date = text || new Date().toISOString().slice(0, 10);
        const updated = { ...flow.data, date };
        setFlow({ ...flow, step: "confirm_balance", data: updated });
        setInputEnabled(false);
        setInputPlaceholder("Selecione uma opção...");
        addMsg("Adicionar ao saldo do banco?", "bot", { quickReplies: [...YES_NO, ...BACK] });
        return;
      }
    }

    // LIVRE
    if (flow.block === "free") {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ message: text, session_id: sessionId, block: "free" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Erro");
        addMsg(data.reply, "bot", { quickReplies: BACK });
      } catch (e: unknown) {
        addMsg(`❌ ${(e as Error).message}`, "bot", { quickReplies: BACK });
      } finally {
        setLoading(false);
      }
    }
  };

  // ── chamadas de API ───────────────────────────────────────────────────────
  const callBankApi = async (body: Record<string, unknown>) => {
    setLoading(true);
    setInputEnabled(false);
    try {
      const res = await fetch(`${API_URL}/chat/bank`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ session_id: sessionId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro");
      // Formatar listagem sem IDs
      let reply = data.reply as string;
      if (body.action === "list") {
        reply = reply.replace(/\[(\d+)\]\s*/g, "");
      }
      addMsg(reply, "bot", { quickReplies: [...BANK_MENU, ...BACK] });
      setFlow({ block: "bank", step: "menu", data: {} });
    } catch (e: unknown) {
      addMsg(`❌ ${(e as Error).message}`, "bot", { quickReplies: [...BANK_MENU, ...BACK] });
    } finally {
      setLoading(false);
      setInputPlaceholder("Selecione uma opção acima...");
    }
  };

  const callCardApi = async (body: Record<string, unknown>) => {
    setLoading(true);
    setInputEnabled(false);
    try {
      const res = await fetch(`${API_URL}/chat/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ session_id: sessionId, ...body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro");
      // Formatar listagem sem IDs
      let reply = data.reply as string;
      if (body.action === "list" || body.action === "limit") {
        reply = reply.replace(/\[(\d+)\]\s*/g, "");
      }
      addMsg(reply, "bot", { quickReplies: [...CARD_MENU, ...BACK] });
      setFlow({ block: "card", step: "menu", data: {} });
    } catch (e: unknown) {
      addMsg(`❌ ${(e as Error).message}`, "bot", { quickReplies: [...CARD_MENU, ...BACK] });
    } finally {
      setLoading(false);
      setInputPlaceholder("Selecione uma opção acima...");
    }
  };

  const submitTransaction = async (data: Record<string, unknown>) => {
    setLoading(true);
    setInputEnabled(false);
    try {
      const res = await fetch(`${API_URL}/chat/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ session_id: sessionId, ...data }),
      });
      const resp = await res.json();
      if (!res.ok) throw new Error(resp.detail || "Erro");
      addMsg(resp.reply, "bot", { quickReplies: MAIN_MENU });
      setFlow(null);
    } catch (e: unknown) {
      addMsg(`❌ ${(e as Error).message}`, "bot", { quickReplies: MAIN_MENU });
    } finally {
      setLoading(false);
      setInputPlaceholder("Selecione uma opção acima...");
    }
  };

  const submitDeposit = async (data: Record<string, unknown>) => {
    setLoading(true);
    setInputEnabled(false);
    try {
      const res = await fetch(`${API_URL}/chat/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ session_id: sessionId, type_id: 1, payment_method_id: 1, ...data }),
      });
      const resp = await res.json();
      if (!res.ok) throw new Error(resp.detail || "Erro");
      addMsg(resp.reply, "bot", { quickReplies: MAIN_MENU });
      setFlow(null);
    } catch (e: unknown) {
      addMsg(`❌ ${(e as Error).message}`, "bot", { quickReplies: MAIN_MENU });
    } finally {
      setLoading(false);
      setInputPlaceholder("Selecione uma opção acima...");
    }
  };

  // ── upload de extrato ─────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_SIZE) { addMsg("❌ Arquivo muito grande. Máximo 5MB.", "bot"); return; }
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
    if (![".pdf", ".csv"].includes(ext)) { addMsg("❌ Envie PDF ou CSV.", "bot"); return; }
    setSelectedFile(f);
    e.target.value = "";
  };

  const submitFile = async () => {
    if (!selectedFile || !flow) return;
    const endpoint = flow.block === "statement_card" ? "statement/card" : "statement/bank";
    setLoading(true);
    addMsg(`📎 ${selectedFile.name}`, "user", { fileName: selectedFile.name });
    try {
      const fd = new FormData();
      fd.append("file", selectedFile);
      fd.append("session_id", sessionId);
      fd.append("message", "");
      // Para extrato de cartão, inclui o card_id selecionado no fluxo
      if (flow.block === "statement_card" && flow.data.card_id) {
        fd.append("card_id", String(flow.data.card_id));
      }
      const res = await fetch(`${API_URL}/chat/${endpoint}`, {
        method: "POST",
        headers: authHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Erro");
      addMsg(data.reply, "bot", { quickReplies: MAIN_MENU });
      setFlow(null);
    } catch (e: unknown) {
      addMsg(`❌ ${(e as Error).message}`, "bot", { quickReplies: MAIN_MENU });
    } finally {
      setLoading(false);
      setSelectedFile(null);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────
  const isUploadBlock = flow?.block === "statement_card" || flow?.block === "statement_bank";

  const chatWindow = isOpen && (
    <div style={{
      position: "fixed", bottom: "6rem", right: "1rem", zIndex: 9999,
      width: "370px", maxWidth: "calc(100vw - 2rem)",
      height: "560px", maxHeight: "calc(100vh - 8rem)",
      background: "rgba(10, 18, 36, 0.98)",
      backdropFilter: "blur(32px) saturate(180%)",
      WebkitBackdropFilter: "blur(32px) saturate(180%)",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
      borderRadius: "1.25rem",
      display: "flex", flexDirection: "column" as const, overflow: "hidden",
    }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#007bff]/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#007bff]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90 leading-none">Assistente</p>
            <p className="text-[10px] text-white/40 mt-0.5">Financeiro</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleClear} title="Limpar histórico"
            className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-red-400 transition-colors cursor-pointer rounded-lg hover:bg-white/5">
            <Trash2 className="w-4 h-4" />
          </button>
          {flow && (
            <button onClick={() => { setFlow(null); setInputEnabled(false); showMainMenu(); }} title="Voltar ao menu"
              className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setIsOpen(false)} aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center text-white/30 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 custom-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}>
            <div className={`flex gap-2 items-end max-w-[85%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {msg.sender === "bot" && (
                <div className="w-6 h-6 rounded-full bg-[#007bff]/20 flex items-center justify-center shrink-0 mb-1">
                  <Bot className="w-3.5 h-3.5 text-[#007bff]" />
                </div>
              )}
              {msg.sender === "user" && (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mb-1">
                  <User className="w-3.5 h-3.5 text-white/50" />
                </div>
              )}
              <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#007bff] text-white rounded-br-sm"
                  : "bg-white/8 text-white/85 border border-white/10 rounded-bl-sm"
              }`} style={msg.sender === "bot" ? { background: "rgba(255,255,255,0.06)" } : {}}>
                {msg.fileName && (
                  <div className="flex items-center gap-1.5 mb-1 text-xs opacity-75">
                    <FileText className="w-3 h-3" />
                    <span className="truncate">{msg.fileName}</span>
                  </div>
                )}
                <MessageText text={msg.text} />
              </div>
            </div>

            {/* Quick replies — só na última mensagem do bot com quickReplies */}
            {msg.sender === "bot" && msg.quickReplies && msg.id === Math.max(...messages.filter(m => m.sender === "bot" && m.quickReplies).map(m => m.id)) && (
              <div className="flex flex-wrap gap-1.5 mt-2 ml-8">
                {msg.quickReplies.map((qr) => (
                  <button key={qr.value} onClick={() => handleQuickReply(qr.value, qr.label)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-full text-xs border border-[#007bff]/40 text-[#007bff] hover:bg-[#007bff] hover:text-white transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                    {qr.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-end">
            <div className="w-6 h-6 rounded-full bg-[#007bff]/20 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-[#007bff]" />
            </div>
            <div className="bg-white/6 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-3 pb-3 pt-2 border-t border-white/8 shrink-0" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {/* Upload area para blocos 5 e 6 */}
        {isUploadBlock && (
          <div className="mb-2">
            <input ref={fileRef} type="file" accept=".pdf,.csv" onChange={handleFileSelect} className="hidden" />
            {selectedFile ? (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70">
                <FileText className="w-4 h-4 text-[#007bff] shrink-0" />
                <span className="truncate flex-1">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-white/40 hover:text-red-400 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
                <button onClick={submitFile} disabled={loading}
                  className="ml-1 bg-[#007bff] hover:bg-[#007bff]/80 disabled:opacity-40 text-white rounded-lg px-2 py-1 text-xs cursor-pointer transition-colors">
                  Enviar
                </button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/8 border border-dashed border-white/20 rounded-xl py-2.5 text-xs text-white/50 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                Selecionar PDF ou CSV (máx. 5MB)
              </button>
            )}
          </div>
        )}

        <div className={`flex gap-2 transition-opacity ${!inputEnabled ? "opacity-40" : ""}`}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={inputPlaceholder}
            disabled={!inputEnabled || loading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#007bff]/50 disabled:cursor-not-allowed transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputEnabled || !input.trim() || loading}
            className="bg-[#007bff] hover:bg-[#007bff]/80 disabled:opacity-30 text-white rounded-xl px-3 py-2.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            aria-label="Enviar">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const fab = (
    <button onClick={() => setIsOpen(p => !p)}
      style={{ position: "fixed", bottom: "1.5rem", right: "1rem", zIndex: 9999 }}
      className="w-14 h-14 bg-[#007bff] hover:bg-[#007bff]/80 text-white rounded-full shadow-lg shadow-blue-900/40 flex items-center justify-center transition-all cursor-pointer hover:scale-105"
      aria-label={isOpen ? "Fechar chat" : "Abrir chat"}>
      {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
    </button>
  );

  return createPortal(<>{chatWindow}{fab}</>, document.body);
}
