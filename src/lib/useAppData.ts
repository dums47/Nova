import { useAppContext } from "./AppContext";

// --- Types ---
export type StudentRow = {
  id: string;
  email: string;
  full_name: string;
  current_level: number;
  department_id: number;
  department?: { name: string };
  outstanding_balance: number;
  is_activated: boolean;
  role: string;
  index_number?: string;
  auth_user_id: string;
  created_at: string;
};

export type TransactionRow = {
  id: string;
  amount_paid: number;
  paystack_reference: string;
  status: string;
  source_account: string;
  fee_id: string;
  index_number: string; 
  created_at: string;
  transactions?: { amount_paid: number } | null;
};

export type ReceiptRow = {
  id: string;
  transaction_id: string;
  index_number: string;
  beneficiary_account: string;
  level: number;
  department_name: string;
  provider: string;
  narration: string;
  issued_at: string;
  amount_paid?: number; 
};

export type FeeRow = {
  id: string;
  fee_name: string;
  target_amount: number;
  department_id: number;
};

// --- Hook ---
export function useAppData() {
  const ctx = useAppContext();
  
  const totalPaid = ctx.transactions
    .filter((t) => t.status?.toLowerCase() === "success")
    .reduce((sum, t) => sum + Number(t.amount_paid || 0), 0);

  const outstanding = ctx.student ? Number(ctx.student.outstanding_balance || 0) : 0;
  
  return {
    student: ctx.student as StudentRow | null,
    departmentName: ctx.student?.department?.name ?? "Not assigned",
    transactions: (ctx.transactions || []) as TransactionRow[],
    receipts: (ctx.receipts || []) as ReceiptRow[],
    fees: (ctx.fees || []) as FeeRow[],
    balances: {
      totalPaid,
      outstanding,
      completion: ctx.balances?.completion ?? 0
    },
    loading: ctx.loading,
  } as const;
}
