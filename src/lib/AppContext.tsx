import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";
import type { StudentRow, TransactionRow, ReceiptRow, FeeRow } from "./useAppData";
import { useQueryClient } from "@tanstack/react-query";

type Notification = { id: string; type: "payment" | "reminder" | "announcement"; title: string; body: string; date: string; read: boolean };

type AppContextValue = {
  session: any | null;
  authUser: any | null;
  student: StudentRow | null;
  students: StudentRow[];
  transactions: TransactionRow[];
  receipts: ReceiptRow[];
  fees: FeeRow[];
  balances: { totalPaid: number; totalTarget: number; outstanding: number; completion: number };
  loading: boolean;
  notifications: Notification[];
  isLoggingOut: boolean;
  signInWithGoogle: (opts?: { redirectTo?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
};

export const AppCtx = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session, user: authUser, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const lastLoadedId = useRef<string | null>(null);

  const authId = useMemo(() => session?.user?.id ?? authUser?.auth_user_id ?? null, [session, authUser]);
  const authEmail = useMemo(() => session?.user?.email ?? null, [session]);

  const signOut = async () => {
    setIsLoggingOut(true);
    queryClient.clear();
    await supabase.auth.signOut();
    Object.keys(localStorage).forEach(k => k.startsWith('sb-') && localStorage.removeItem(k));
    sessionStorage.clear();
    window.location.href = '/login';
  };

  useEffect(() => {
    if (authLoading || isLoggingOut) return;
    
    const identity = authId ?? authEmail;
    if (!identity) {
      setLoading(false);
      return;
    }

    if (lastLoadedId.current === identity) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { data: s } = await supabase
          .from("studenttable")
          .select(`*, department!department_id(name)`)
          .eq(authId ? "auth_user_id::uuid" : "email", identity)
          .maybeSingle();

        if (!s) { if (mounted) setStudent(null); return; }

        const studentRow = { 
            ...s, 
            full_name: session?.user?.user_metadata?.full_name ?? authUser?.full_name ?? s.full_name 
        } as StudentRow;

        const isAdmin = studentRow.role === 'admin';

        const [txRes, rcRes, fRes, stRes] = await Promise.all([
          isAdmin ? supabase.from("transactions_table").select("*") : supabase.from("transactions_table").select("*").eq("index_number", s.index_number),
          isAdmin ? supabase.from("receipts").select("*") : supabase.from("receipts").select("*").eq("index_number", s.index_number),
          supabase.from("fees").select("*"),
          isAdmin ? supabase.from("studenttable").select("*, department!department_id(name)") : Promise.resolve({ data: [] })
        ]);

        if (mounted) {
          setStudent(studentRow);
          const txs = (txRes.data ?? []) as TransactionRow[];
          setTransactions(txs);

          // Map the transaction amount to each receipt object
          const receiptsWithAmount = ((rcRes.data ?? []) as any[]).map((r) => {
            const matchingTx = txs.find((t) => t.id === r.transaction_id);
            return { 
              ...r, 
              amount_paid: matchingTx ? matchingTx.amount_paid : 0 
            };
          });

          setReceipts(receiptsWithAmount as ReceiptRow[]);
          setFees((fRes.data ?? []) as FeeRow[]);
          setStudents((stRes.data ?? []) as StudentRow[]);
          lastLoadedId.current = identity;
        }
      } catch (e) { console.error("AppProvider load error", e); } 
      finally { if (mounted) setLoading(false); }
    };

    load();
    return () => { mounted = false; };
  }, [authId, authEmail, authLoading, isLoggingOut]);

  const balances = useMemo(() => {
    const totalPaid = transactions.reduce((a, b) => a + Number(b.amount_paid ?? 0), 0);
    const relevantFees = fees.filter(f => f.department_id === student?.department_id);
    const totalTarget = relevantFees.reduce((a, b) => a + Number(b.target_amount ?? 0), 0);
    
    return { 
      totalPaid, 
      totalTarget, 
      outstanding: Math.max(0, totalTarget - totalPaid), 
      completion: totalTarget > 0 ? Math.min(100, Math.round((totalPaid / totalTarget) * 100)) : 0 
    };
  }, [transactions, fees, student?.department_id]);

  const value = useMemo(() => ({
    session, authUser, student, students, transactions, receipts, fees, balances, loading, notifications, isLoggingOut,
    signInWithGoogle: async () => {}, signOut, markNotificationsRead: async () => {},
  }), [session, authUser, student, students, transactions, receipts, fees, balances, loading, notifications, isLoggingOut]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppContext() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useAppContext must be used within AppProvider");
  return v;
}