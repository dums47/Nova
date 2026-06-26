import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { formatGHS } from "@/lib/store";
import { Users, Wallet, Clock, Activity } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { StatusPill } from "./dashboard";
import { useAppContext } from "../lib/AppContext";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Compssa Dues" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { transactions, students, loading } = useAppContext();
  const [showStudents, setShowStudents] = useState(false);

  const stats = useMemo(() => ({
    totalRevenue: transactions.reduce((acc, tx) => acc + Number(tx.amount_paid || 0), 0),
    pendingPayments: transactions.filter(tx => tx.status === 'pending').length,
    activeStudents: students.filter(s => s.status?.toLowerCase() === 'active').length,
  }), [transactions, students]);

  const monthlyRevenue = useMemo(() => {
    const data: Record<string, number> = {};
    transactions.forEach(tx => {
      const month = new Date(tx.created_at).toLocaleString('default', { month: 'short' });
      data[month] = (data[month] || 0) + Number(tx.amount_paid);
    });
    return Object.entries(data).map(([m, revenue]) => ({ m, revenue }));
  }, [transactions]);

  const weeklyTrends = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const data: Record<string, { success: number, failed: number }> = {};
    days.forEach(d => data[d] = { success: 0, failed: 0 });
    transactions.forEach(tx => {
      const day = days[new Date(tx.created_at).getDay()];
      if (tx.status === 'success') data[day].success += 1;
      else if (tx.status === 'failed') data[day].failed += 1;
    });
    return Object.entries(data).map(([d, counts]) => ({ d, ...counts }));
  }, [transactions]);
  
  if (loading) return <AppShell title="Admin dashboard">Loading...</AppShell>;

  return (
    <AppShell title="Admin dashboard" subtitle="Compssa Department · Dues administration">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div onClick={() => setShowStudents(true)} className="cursor-pointer transition-transform hover:scale-[1.02]">
           <Kpi label="Total students" value={students.length.toLocaleString()} sub="Click to view list" icon={<Users className="h-5 w-5" />} tone="primary" />
        </div>
        <Kpi label="Total revenue" value={formatGHS(stats.totalRevenue)} sub="Total confirmed collections" icon={<Wallet className="h-5 w-5" />} tone="success" />
        <Kpi label="Pending payments" value={stats.pendingPayments.toString()} sub="Transactions awaiting approval" icon={<Clock className="h-5 w-5" />} tone="warning" />
        <Kpi label="Active students" value={stats.activeStudents.toLocaleString()} sub="Currently active" icon={<Activity className="h-5 w-5" />} tone="accent" />
      </div>

      {showStudents && <StudentListModal students={students} onClose={() => setShowStudents(false)} />}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Monthly revenue</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="m" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#2563EB" fill="#2563EB" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Payment trends</h2>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="d" stroke="#94a3b8" fontSize={12} />
                <Bar dataKey="success" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-6 border-b border-border"><h2 className="text-lg font-semibold">Recent Payments</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="px-6 py-3 text-left font-medium">ID</th><th className="px-6 py-3 text-left font-medium">Student</th><th className="px-6 py-3 text-right font-medium">Amount</th><th className="px-6 py-3 text-right font-medium">Status</th></tr>
            </thead>
            <tbody>
              {transactions.slice(0, 5).map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-6 py-4 font-mono text-xs">{p.id.slice(0, 8)}</td>
                  <td className="px-6 py-4">{p.index_number}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatGHS(p.amount_paid)}</td>
                  <td className="px-6 py-4 text-right"><StatusPill status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function StudentListModal({ students, onClose }: { students: any[], onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Registered Students</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground underline text-sm">Close</button>
        </div>
        <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
          {students.map((s) => (
            <div key={s.id} className="flex justify-between p-3 rounded-lg bg-secondary/50 border border-border text-sm">
              <span className="font-medium">{s.full_name}</span>
              <span className="font-mono text-muted-foreground">{s.index_number}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, icon, tone }: { label: string; value: string; sub: string; icon: React.ReactNode; tone: "primary" | "success" | "accent" | "warning" }) {
  const tones: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    accent: "bg-accent/15 text-accent",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${tones[tone]}`}>{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}