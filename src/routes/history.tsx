import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { formatGHS } from "@/lib/store";
import { StatusPill } from "./dashboard";
import { useAppContext } from "@/lib/AppContext"; // USE THIS
import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Payment History — Compssa Dues" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  // Use the Single Source of Truth
  const { transactions, student, loading } = useAppContext();

  // Memoize the mapping to avoid re-calculating on every render unless transactions change
  const txs = useMemo(() => transactions.map((t) => ({
    id: t.id,
    reference: t.paystack_reference,
    date: t.created_at ?? new Date().toISOString(),
    level: student?.current_level ?? 300,
    amount: t.amount_paid,
    status: (t.status === "success" ? "Success" : t.status === "pending" ? "Pending" : "Failed") as "Success" | "Pending" | "Failed"
  })), [transactions, student]);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "Success" | "Pending" | "Failed">("all");
  const [sort, setSort] = useState<"date-desc" | "date-asc" | "amount-desc" | "amount-asc">("date-desc");

  const rows = useMemo(() => {
    let r = txs.filter((t) =>
      (filter === "all" || t.status === filter) &&
      (q === "" || t.id.toLowerCase().includes(q.toLowerCase()) || (t.reference ?? "").toLowerCase().includes(q.toLowerCase()))
    );
    r = [...r].sort((a, b) => {
      if (sort === "date-desc") return +new Date(b.date) - +new Date(a.date);
      if (sort === "date-asc") return +new Date(a.date) - +new Date(b.date);
      if (sort === "amount-desc") return b.amount - a.amount;
      return a.amount - b.amount;
    });
    return r;
  }, [txs, q, filter, sort]);

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(16);
    doc.text("Payment History", 14, 16);

    doc.setFontSize(10);
    doc.setTextColor(100);
    const generatedAt = new Date().toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" });
    doc.text(`Generated: ${generatedAt}`, 14, 22);
    if (student?.full_name) {
      doc.text(`Student: ${student.full_name} (${student.index_number ?? ""})`, 14, 27);
    }

    autoTable(doc, {
      startY: 32,
      head: [["Transaction ID", "Reference", "Date", "Level", "Amount", "Status"]],
      body: rows.map((t) => [
        t.id,
        t.reference ?? "",
        new Date(t.date).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" }),
        `Level ${t.level}`,
        formatGHS(t.amount),
        t.status,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 41, 59] }, // slate-800-ish header
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        4: { halign: "right" },
        5: { halign: "right" },
      },
    });

    const filename = `payment-history-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  if (loading) return <AppShell title="Payment history">Loading transactions...</AppShell>;

  return (
    <AppShell title="Payment history" subtitle="Search, filter, and export every transaction." actions={
      <Button variant="outline" className="gap-2" onClick={handleExportPdf} disabled={rows.length === 0}>
        <Download className="h-4 w-4" /> Export PDF
      </Button>
    }>
      <div className="rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center gap-3 p-4 md:p-6 border-b border-border">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by transaction ID or reference…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10 h-10" />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Success">Success</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => setSort(v as any)}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest first</SelectItem>
              <SelectItem value="date-asc">Oldest first</SelectItem>
              <SelectItem value="amount-desc">Amount: high → low</SelectItem>
              <SelectItem value="amount-asc">Amount: low → high</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Transaction ID</th>
                <th className="px-6 py-3 text-left font-medium">Reference</th>
                <th className="px-6 py-3 text-left font-medium">Date</th>
                <th className="px-6 py-3 text-left font-medium">Level</th>
                <th className="px-6 py-3 text-right font-medium">Amount</th>
                <th className="px-6 py-3 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-secondary/30 transition">
                  <td className="px-6 py-4 font-mono text-xs">{t.id}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{t.reference}</td>
                  <td className="px-6 py-4 text-muted-foreground">{new Date(t.date).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="px-6 py-4">Level {t.level}</td>
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