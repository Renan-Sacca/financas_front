const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("Sessão expirada");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.detail || `Erro ${response.status}: ${response.statusText}`,
    );
  }

  if (response.status === 204) return {} as T;
  return response.json();
}

// ──── AUTH ────
export const authApi = {
  login: (email: string, password: string) =>
    fetchApi<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (data: {
    full_name: string;
    email: string;
    telefone: string;
    password: string;
  }) =>
    fetchApi<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  forgotPassword: (email: string) =>
    fetchApi<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  getProfile: () =>
    fetchApi<import("@/types").User>("/auth/me"),

  updateProfile: (data: Partial<import("@/types").User>) =>
    fetchApi<import("@/types").User>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  refreshToken: () =>
    fetchApi<{ access_token: string }>("/auth/refresh-token", {
      method: "POST",
    }),
};

// ──── BANKS ────
export const banksApi = {
  list: () =>
    fetchApi<import("@/types").Bank[]>("/banks"),

  get: (id: number) =>
    fetchApi<import("@/types").Bank>(`/banks/${id}`),

  create: (data: { name: string; current_balance: number }) =>
    fetchApi<import("@/types").Bank>("/banks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name: string; current_balance: number }) =>
    fetchApi<import("@/types").Bank>(`/banks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/banks/${id}`, { method: "DELETE" }),
};

// ──── CARDS ────
export const cardsApi = {
  list: () =>
    fetchApi<import("@/types").Card[]>("/cards"),

  listByBank: (bankId: number) =>
    fetchApi<import("@/types").Card[]>(`/cards?bank_id=${bankId}`),

  create: (
    bankId: number,
    data: {
      name: string;
      type: string;
      limit_amount?: number;
      due_day?: number;
    },
  ) =>
    fetchApi<import("@/types").Card>(`/banks/${bankId}/cards`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: {
      bank_id: number;
      name: string;
      type: string;
      limit_amount?: number | null;
      due_day?: number | null;
    },
  ) =>
    fetchApi<import("@/types").Card>(`/cards/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/cards/${id}`, { method: "DELETE" }),
};

// ──── CATEGORIES ────
export const categoriesApi = {
  list: () =>
    fetchApi<import("@/types").Category[]>("/categories"),

  create: (data: { name: string; color: string }) =>
    fetchApi<import("@/types").Category>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: { name: string; color: string }) =>
    fetchApi<import("@/types").Category>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/categories/${id}`, { method: "DELETE" }),
};

// ──── TRANSACTIONS ────
export const transactionsApi = {
  list: async (params?: Record<string, string>) => {
    const query = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    const items = await fetchApi<import("@/types").Transaction[]>(
      `/transactions${query}`,
    );
    return items.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return (a.installment_number || 0) - (b.installment_number || 0);
    });
  },

  create: (data: {
    card_id: number;
    amount: number;
    description: string;
    date: string;
    total_installments?: number;
    category_id?: number | null;
  }) =>
    fetchApi<import("@/types").Transaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: {
      card_id: number;
      amount: number;
      description: string;
      date: string;
      category_id?: number | null;
      total_installments?: number;
    },
  ) =>
    fetchApi<import("@/types").Transaction>(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/transactions/${id}`, { method: "DELETE" }),

  updateStatus: (id: number) =>
    fetchApi<import("@/types").Transaction>(`/transactions/${id}/toggle-payment`, {
      method: "PATCH",
    }),

  markPreviousAsPaid: () =>
    fetchApi<{ updated: number }>("/transactions/mark-previous-as-paid", {
      method: "PATCH",
    }),

  updateGroup: (data: {
    group_id: string;
    card_id: number;
    total_amount?: number;
    description: string;
    date: string;
    category_id?: number | null;
    installments?: number;
  }) =>
    fetchApi<void>("/transactions/update-group", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteGroup: (groupId: string) =>
    fetchApi<void>(`/transactions/delete-group/${groupId}`, {
      method: "DELETE",
    }),
};

// ──── DEPOSITS ────
export const depositsApi = {
  list: (params?: Record<string, string>) => {
    const query = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return fetchApi<import("@/types").Deposit[]>(`/deposits${query}`);
  },

  create: (data: {
    bank_id: number;
    amount: number;
    description?: string;
    type_id: number;
    payment_method_id: number;
    income_category_id?: number | null;
    income_category_name?: string | null;
    date: string;
    add_to_balance?: boolean;
  }) =>
    fetchApi<import("@/types").Deposit>("/deposits", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/deposits/${id}`, { method: "DELETE" }),

  update: (id: number, data: {
    bank_id?: number;
    amount?: number;
    description?: string;
    type_id?: number;
    payment_method_id?: number;
    income_category_id?: number | null;
    date?: string;
    adjust_balance?: boolean;
  }) =>
    fetchApi<import("@/types").Deposit>(`/deposits/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Income Types
  listIncomeTypes: () =>
    fetchApi<import("@/types").IncomeType[]>("/deposits/income-types"),

  // Payment Methods
  listPaymentMethods: () =>
    fetchApi<import("@/types").PaymentMethod[]>("/deposits/payment-methods"),

  // Income Categories
  listIncomeCategories: () =>
    fetchApi<import("@/types").IncomeCategory[]>("/deposits/income-categories"),

  createIncomeCategory: (data: { name: string; color?: string }) =>
    fetchApi<import("@/types").IncomeCategory>("/deposits/income-categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateIncomeCategory: (id: number, data: { name: string; color?: string }) =>
    fetchApi<import("@/types").IncomeCategory>(`/deposits/income-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  deleteIncomeCategory: (id: number) =>
    fetchApi<void>(`/deposits/income-categories/${id}`, { method: "DELETE" }),
};

// ──── SUMMARY ────
export const summaryApi = {
  get: () =>
    fetchApi<import("@/types").FinancialSummary>("/summary"),

  getMonthlyExpenses: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi<{ month: string; total: number }[]>(
      `/summary/monthly-expenses${query}`
    );
  },

  getCardExpenses: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi<{ card: string; total: number }[]>(
      `/summary/card-expenses${query}`
    );
  },

  getCategoryExpenses: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi<{ category: string; total: number; color?: string }[]>(
      `/summary/category-expenses${query}`
    );
  },

  getCreditLimits: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return fetchApi<{ card_name: string; bank_name: string; total_limit: number; used_limit: number; available_limit: number }[]>(
      `/summary/credit-limits${query}`
    );
  },
};

// ──── PENDING STATEMENTS ────
export const pendingApi = {
  listAll: (status = "pending") =>
    fetchApi<import("@/types").PendingItem[]>(`/pending?status=${status}`),

  listBatch: (batchId: string) =>
    fetchApi<import("@/types").PendingItem[]>(`/pending/batch/${batchId}`),

  listBatches: () =>
    fetchApi<import("@/types").BatchSummary[]>("/pending/batches"),

  update: (id: number, data: Partial<import("@/types").PendingItem>) =>
    fetchApi<import("@/types").PendingItem>(`/pending/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  setStatus: (id: number, status: string) =>
    fetchApi<{ id: number; status: string }>(`/pending/${id}/status?status=${status}`, {
      method: "PATCH",
    }),

  delete: (id: number) =>
    fetchApi<void>(`/pending/${id}`, { method: "DELETE" }),

  confirmBatch: (batchId: string) =>
    fetchApi<{ message: string; created: number }>(`/pending/batch/${batchId}/confirm`, {
      method: "POST",
    }),
};

// ──── PENDING BANK STATEMENTS ────
export const pendingBankApi = {
  listBatches: () =>
    fetchApi<import("@/types").BankBatchSummary[]>("/pending-bank/batches"),

  listBatch: (batchId: string) =>
    fetchApi<import("@/types").PendingBankItem[]>(`/pending-bank/batch/${batchId}`),

  update: (id: number, data: Partial<import("@/types").PendingBankItem>) =>
    fetchApi<import("@/types").PendingBankItem>(`/pending-bank/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  setStatus: (id: number, status: string) =>
    fetchApi<{ id: number; status: string }>(`/pending-bank/${id}/status?status=${status}`, {
      method: "PATCH",
    }),

  delete: (id: number) =>
    fetchApi<void>(`/pending-bank/${id}`, { method: "DELETE" }),

  confirmBatch: (batchId: string) =>
    fetchApi<{ message: string; created: number }>(`/pending-bank/batch/${batchId}/confirm`, {
      method: "POST",
    }),
};

// ──── RECURRING ────
export const recurringApi = {
  list: () =>
    fetchApi<import("@/types").RecurringPurchase[]>("/recurring"),

  create: (data: {
    card_id: number;
    category_id?: number | null;
    description: string;
    amount: number;
    day_of_month: number;
  }) =>
    fetchApi<import("@/types").RecurringPurchase>("/recurring", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (
    id: number,
    data: {
      card_id?: number;
      category_id?: number | null;
      description?: string;
      amount?: number;
      day_of_month?: number;
      is_active?: boolean;
    }
  ) =>
    fetchApi<import("@/types").RecurringPurchase>(`/recurring/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchApi<void>(`/recurring/${id}`, { method: "DELETE" }),

  insert: (id: number) =>
    fetchApi<{ message: string; transaction_date: string }>(
      `/recurring/${id}/insert`,
      { method: "POST" }
    ),

  insertAll: () =>
    fetchApi<{ message: string; count: number }>(
      `/recurring/insert-all`,
      { method: "POST" }
    ),
};
