import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";
import type { StudentRow, TransactionRow, ReceiptRow, FeeRow } from "./useAppData";

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
  signInWithGoogle: (opts?: { redirectTo?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
};

export const AppCtx = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { session, user: authUser, loading: authLoading } = useAuth();
  
  const [student, setStudent] = useState<StudentRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Use a ref to track the last loaded ID to prevent redundant fetches
  const lastLoadedId = useRef<string | null>(null);

  const authId = useMemo(() => session?.user?.id ?? authUser?.auth_user_id ?? null, [session, authUser]);
  const authEmail = useMemo(() => session?.user?.email ?? null, [session]);

  useEffect(() => {
    // If auth is still loading, or we have no identity, wait.
    if (authLoading) return;
    
    const identity = authId ?? authEmail;
    if (!identity) {
      setLoading(false);
      return;
    }

    // Prevent re-fetching if the identity hasn't changed
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

        if (!s) {
          if (mounted) setStudent(null);
          return;
        }

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
          setTransactions((txRes.data ?? []) as TransactionRow[]);
          setReceipts((rcRes.data ?? []) as ReceiptRow[]);
          setFees((fRes.data ?? []) as FeeRow[]);
          setStudents((stRes.data ?? []) as StudentRow[]);
          lastLoadedId.current = identity; // Mark as loaded
        }
      } catch (e) {
        console.error("AppProvider load error", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [authId, authEmail, authLoading]); // Dependency array is now safe

  const balances = useMemo(() => {
    const totalPaid = transactions.reduce((a, b) => a + Number(b.amount_paid ?? 0), 0);
    const totalTarget = fees.reduce((a, b) => a + Number(b.target_amount ?? 0), 0);
    const outstanding = Math.max(0, totalTarget - totalPaid);
    const completion = totalTarget > 0 ? Math.min(100, Math.round((totalPaid / totalTarget) * 100)) : 0;
    return { totalPaid, totalTarget, outstanding, completion };
  }, [transactions, fees]);

  const value = useMemo(() => ({
    session, authUser, student, students, transactions, receipts, fees, balances, loading, notifications,
    signInWithGoogle: async () => {}, signOut: async () => {}, markNotificationsRead: async () => {},
  }), [session, authUser, student, students, transactions, receipts, fees, balances, loading, notifications]);

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useAppContext() {
  const v = useContext(AppCtx);
  if (!v) throw new Error("useAppContext must be used within AppProvider");
  return v;
}