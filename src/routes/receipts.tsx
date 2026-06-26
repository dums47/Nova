import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatGHS } from "@/lib/store";
import { useAppContext } from "@/lib/AppContext"; // Use Context
import { Download, Eye, ReceiptText, X } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/receipts")({
  head: () => ({ meta: [{ title: "Receipts — Compssa Dues" }] }),
  component: ReceiptsPage,
});

function ReceiptsPage() {
  // Consuming the global state
  const { receipts, student, transactions, loading } = useAppContext();
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const getAmount = (transactionId: string) => {
    const tx = transactions.find((t) => t.id === transactionId);
    return tx ? tx.amount_paid : 0;
  };

  const handleDownload = () => {
    if (!selectedReceipt) return;
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Compssa Dues", 20, 20);
    
    doc.setFontSize(12);
    const data = [
      { k: "Index Number", v: student?.index_number || "N/A" },
      { k: "Amount Paid", v: formatGHS(getAmount(selectedReceipt.transaction_id)) },
      { k: "Beneficiary", v: selectedReceipt.beneficiary_account },
      { k: "Level", v: selectedReceipt.level },
      { k: "Provider", v: selectedReceipt.provider },
      { k: "Date", v: new Date(selectedReceipt.issued_at).toLocaleDateString("en-GH", { dateStyle: "medium" }) }
    ];

    data.forEach((item, index) => {
      doc.text(`${item.k}: ${item.v}`, 20, 40 + (index * 10));
    });

    doc.save(`Receipt_${selectedReceipt.id.slice(0, 8)}.pdf`);
  };

  if (loading) return <AppShell title="Receipts">Loading your records...</AppShell>;
  if (!student) return <AppShell title="Receipts">Not signed in.</AppShell>;

  return (
    <AppShell title="Receipts" subtitle="View details of your successful payments.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {receipts.map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div className="text-xs font-mono text-muted-foreground">ID: {r.id.slice(0, 8)}</div>
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Department</div>
              <div className="text-xl font-bold">Compssa</div>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <Row k="Date" v={new Date(r.issued_at).toLocaleDateString("en-GH", { dateStyle: "medium" })} />
              <Row k="Level" v={r.level} />
            </dl>
            <div className="mt-5">
              <Button size="sm" variant="outline" className="w-full gap-1.5" onClick={() => setSelectedReceipt(r)}>
                <Eye className="h-4 w-4" /> View Details
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-0 shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-6 bg-primary text-primary-foreground">
              <h2 className="text-xl font-bold">Compssa Dues</h2>
              <Button variant="ghost" size="icon" onClick={() => setSelectedReceipt(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4 bg-white">
              <StaticRow k="Index Number" v={student.index_number || "N/A"} />
              <StaticRow k="Amount Paid" v={formatGHS(getAmount(selectedReceipt.transaction_id))} />
              <StaticRow k="Beneficiary" v={selectedReceipt.beneficiary_account} />
              <StaticRow k="Level" v={selectedReceipt.level} />
              <StaticRow k="Provider" v={selectedReceipt.provider} />
              <StaticRow k="Date" v={new Date(selectedReceipt.issued_at).toLocaleDateString("en-GH", { dateStyle: "medium" })} />
            </div>

            <div className="p-6 pt-0 bg-white">
              <Button className="w-full gap-2" size="lg" onClick={handleDownload}>
                <Download className="h-4 w-4" /> Download PDF Receipt
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function StaticRow({ k, v }: { k: string, v: string }) {
  return (
    <div className="flex justify-between text-sm text-black">
      <span className="text-gray-500">{k}</span>
      <span className="font-semibold">{v}</span>
    </div>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  );
}