export interface User {
  id: number;
  email: string;
  full_name: string;
  telefone?: string | null;
  id_telegram?: number | null;
  username_telegram?: string | null;
  is_active: boolean;
}

export interface Bank {
  id: number;
  name: string;
  current_balance: number;
  user_id: number;
}

export interface Card {
  id: number;
  name: string;
  type: "credit" | "debit";
  limit_amount?: number | null;
  due_day?: number | null;
  bank_id: number;
  bank_name?: string;
}

export interface Category {
  id: number;
  name: string;
  color: string;
  user_id: number;
}

export interface Transaction {
  id: number;
  card_id: number;
  card_name?: string;
  bank_name?: string;
  category_id?: number | null;
  category_name?: string | null;
  category_color?: string | null;
  amount: number;
  description: string;
  date: string;
  purchase_date?: string | null;
  is_paid: boolean;
  installment_number?: number | null;
  total_installments?: number | null;
  group_id?: string | null;
  created_via?: string;
}

export interface Deposit {
  id: number;
  user_id: number;
  bank_id?: number | null;
  bank_name?: string | null;
  amount: number;
  description?: string | null;
  type_id: number;
  type_name?: string | null;
  payment_method_id: number;
  payment_method_name?: string | null;
  income_category_id?: number | null;
  income_category_name?: string | null;
  income_category_color?: string | null;
  date: string;
  source?: string | null;
}

export interface IncomeType {
  id: number;
  name: string;
}

export interface PaymentMethod {
  id: number;
  name: string;
}

export interface IncomeCategory {
  id: number;
  user_id: number;
  name: string;
  color?: string | null;
}

export interface FinancialSummary {
  total_balance: number;
  total_credit_limit: number;
  total_credit_used: number;
  total_credit_available: number;
  banks: BankSummary[];
}

export interface BankSummary {
  id: number;
  name: string;
  current_balance: number;
  cards: CardSummary[];
}

export interface CardSummary {
  id: number;
  name: string;
  type: string;
  limit_amount?: number | null;
  used_amount?: number;
  available_amount?: number;
  due_day?: number | null;
}

export interface MonthlyExpense {
  month: string;
  year: number;
  total: number;
}

export interface RecurringPurchase {
  id: number;
  card_id: number;
  card_name: string;
  bank_name: string;
  category_id?: number | null;
  category_name?: string | null;
  category_color?: string | null;
  description: string;
  amount: number;
  day_of_month: number;
  is_active: boolean;
}

export interface PendingItem {
  id: number;
  batch_id: string;
  card_id: number;
  card_name?: string | null;
  bank_name?: string | null;
  descricao: string;
  valor: number;
  data_compra: string;
  tipo?: string | null;
  status: "pending" | "approved" | "rejected" | "confirmed";
  category_id?: number | null;
  category_name?: string | null;
  filename?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
  created_at: string;
}

export interface BatchSummary {
  batch_id: string;
  filename?: string | null;
  card_name?: string | null;
  bank_name?: string | null;
  total_items: number;
  pending: number;
  approved: number;
  rejected: number;
  created_at: string;
}
