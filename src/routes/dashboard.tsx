import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { formatGHS } from "@/lib/store";
import { useAppData } from "@/lib/useAppData";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Download, History, Wallet, CheckCircle2, TrendingUp, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Compssa Dues Payment System" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { student, transactions, balances, fees, loading } = useAppData();

  // Guard loading loop tracking state to block premature array map actions
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-medium animate-pulse">
            Retrieving financial records...
          </p>
        </div>
      </div>
    );
  }

  // Safe mapping matching database 'amount_paid' and 'paystack_reference' properties
  const txs = transactions.map((t) => {
    let normalizedStatus: "Success" | "Pending" | "Failed" = "Pending";
    const lowerStatus = t.status?.toLowerCase();
    
    if (lowerStatus === "success") normalizedStatus = "Success";
    if (lowerStatus === "failed") normalizedStatus = "Failed";

    return {
      id: t.id,
      date: t.created_at ?? new Date().toISOString(),
      amount: Number(t.amount_paid || 0),
      level: student?.current_level ?? 200,
      status: normalizedStatus,
      reference: t.paystack_reference,
      method: t.source_account ? "Mobile Money" : "Card"
    };
  });

  const b = balances;

  return (
    <AppShell 
      title={`Welcome back, ${student?.full_name?.split(" ")[0] ?? "User"}`} 
      subtitle="Here's where your dues stand today." 
      actions={
        <Link to="/payment">
          <Button className="gap-2 shadow-elegant">
            <Wallet className="h-4 w-4" /> Pay now
          </Button>
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Outstanding balance" value={formatGHS(b.outstanding)} sub={`${b.outstanding === 0 ? "All cleared" : "Across remaining levels"}`} icon={<Wallet className="h-5 w-5" />} tone="primary" />
        <StatCard label="Total paid" value={formatGHS(b.totalPaid)} sub={`${txs.filter((t) => t.status === "Success").length} successful payments`} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Completion" value={`${b.completion}%`} sub="of total dues paid" icon={<TrendingUp className="h-5 w-5" />} tone="accent" progress={b.completion} />
        <StatCard label="Current level" value={`Level ${student?.current_level ?? "N/A"}`} sub={`Outstanding: ${formatGHS(student?.outstanding_balance ?? b.outstanding)}`} icon={<GraduationCap className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Level progress tracker</h2>
              <p className="text-sm text-muted-foreground">GHS 100 due per academic level.</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {fees.map((fee) => {
              const paid = transactions
                .filter((t) => t.fee_id === fee.id && t.status?.toLowerCase() === "success")
                .reduce((a, b) => a + Number(b.amount_paid ?? 0), 0);
                
              const targetAmount = Number(fee.target_amount || 100);
              const pct = Math.min(100, Math.round((paid / targetAmount) * 100));
              const fully = paid >= targetAmount;
              const partly = paid > 0 && !fully;
              
              return (
                <div key={fee.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-semibold ${fully ? "bg-success/15 text-success" : partly ? "bg-warning/15 text-warning" : "bg-secondary text-muted-foreground"}`}>{fee.fee_name}</div>
                      <div>
                        <div className="font-medium">{fee.fee_name}</div>
                        <div className="text-xs text-muted-foreground">{formatGHS(paid)} / {formatGHS(targetAmount)}</div>
                      </div>
                    </div>
                    <Pill tone={fully ? "success" : partly ? "warning" : "muted"}>{fully ? "Paid" : partly ? "Partial" : "Pending"}</Pill>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className={`h-full ${fully ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="text-lg font-semibold">Quick actions</h2>
          <div className="mt-4 space-y-3">
            <Link to="/payment"><Button className="w-full justify-between gap-2 shadow-elegant">Pay now <ArrowUpRight className="h-4 w-4" /></Button></Link>
            <Link to="/receipts"><Button variant="outline" className="w-full justify-between gap-2">Download receipt <Download className="h-4 w-4" /></Button></Link>
            <Link to="/history"><Button variant="outline" className="w-full justify-between gap-2">View history <History className="h-4 w-4" /></Button></Link>
          </div>
          <div className="mt-6 rounded-xl bg-gradient-to-br from-primary to-accent p-5 text-primary-foreground">
            <div className="text-xs uppercase tracking-wider opacity-80">Tip</div>
            <div className="mt-1 font-semibold">Clear all in one click</div>
            <p className="mt-1 text-sm opacity-90">Pay your full outstanding balance and stay in good standing across all levels.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="flex items-center justify-between p-6">
          <div>
            <h2 className="text-lg font-semibold">Recent transactions</h2>
            <p className="text-sm text-muted-foreground">Your last 5 payments.</p>
          </div>
          <Link to="/history"><Button variant="ghost" size="sm" className="gap-1">View all <ArrowUpRight className="h-3.5 w-3.5" /></Button></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Transaction</th>
                <th className="px-6 py-3 text-left font-medium">Date</th>
                <th className="px-6 py-3 text-left font-medium">Level</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {txs.slice(0, 5).map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-6 py-4 font-medium max-w-[120px] truncate" title={t.id}>{t.id}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(t.date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="px-6 py-4">{t.level}</td>
                  <td className="px-6 py-4 text-right font-medium">{formatGHS(t.amount)}</td>
                  <td className="px-6 py-4 text-right"><StatusPill status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
  progress,
}: {
  label: string;
  value: string;
  sub: string;
  icon: ReactNode;
  tone: "primary" | "success" | "accent" | "warning";
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[.18em] text-muted-foreground">{label}</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
        </div>
        <div className={`rounded-2xl p-3 text-white ${tone === "primary" ? "bg-primary" : tone === "success" ? "bg-success" : tone === "accent" ? "bg-accent" : "bg-warning"}`}>
          {icon}
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function Pill({
  tone,
  children,
}: {
  tone: "success" | "warning" | "muted";
  children: ReactNode;
}) {
  const classes = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    muted: "bg-muted/10 text-muted-foreground",
  }[tone];

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{children}</span>;
}

export function StatusPill({ status }: { status: string }) {
  const normalized = status?.toLowerCase();
  const tone = normalized === "success" ? "success" : normalized === "failed" ? "warning" : "muted";
  return <Pill tone={tone}>{normalized === "success" ? "Success" : normalized === "failed" ? "Failed" : "Pending"}</Pill>;
}
