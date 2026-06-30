import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatGHS } from "@/lib/store";
import { useAppContext } from "@/lib/AppContext";
import { Download, Eye, ReceiptText, X } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/receipts")({
  head: () => ({ meta: [{ title: "Receipts — Compssa Dues" }] }),
  component: ReceiptsPage,
});

// Match these to your actual brand color (Tailwind primary), in RGB 0-255.
const BRAND_COLOR: [number, number, number] = [79, 70, 229]; // indigo-ish — adjust to your theme
const TEXT_DARK: [number, number, number] = [17, 24, 39]; // gray-900
const TEXT_MUTED: [number, number, number] = [107, 114, 128]; // gray-500
const BORDER_LIGHT: [number, number, number] = [229, 231, 235]; // gray-200

function ReceiptsPage() {
  const { receipts, student, loading } = useAppContext();
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);

  const handleDownload = () => {
    if (!selectedReceipt) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 20;
    const cardWidth = pageWidth - marginX * 2;

    // Header band (mirrors the modal's bg-primary header)
    doc.setFillColor(...BRAND_COLOR);
    doc.rect(0, 0, pageWidth, 38, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Compssa Dues", marginX, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Official Payment Receipt", marginX, 31);

    // Card body background (mirrors the modal's bg-white panel)
    const cardTop = 38;
    const cardBottom = 195;
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setFillColor(255, 255, 255);
    doc.rect(marginX, cardTop, cardWidth, cardBottom - cardTop, "FD");

    // Rows
    const rowsData: { k: string; v: string }[] = [
      { k: "Index Number", v: student?.index_number || "N/A" },
      { k: "Amount Paid", v: formatGHS(selectedReceipt.amount_paid || 0) },
      { k: "Beneficiary", v: selectedReceipt.beneficiary_account || "N/A" },
      { k: "Level", v: String(selectedReceipt.level ?? "N/A") },
      { k: "Provider", v: selectedReceipt.provider || "N/A" },
      {
        k: "Date",
        v: new Date(selectedReceipt.issued_at).toLocaleDateString("en-GH", { dateStyle: "medium" }),
      },
      { k: "Receipt ID", v: String(selectedReceipt.id).slice(0, 8).toUpperCase() },
    ];

    const rowPaddingX = 12;
    let y = cardTop + 16;
    const rowHeight = 13;

    rowsData.forEach((item, i) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...TEXT_MUTED);
      doc.text(item.k, marginX + rowPaddingX, y);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TEXT_DARK);
      doc.text(item.v, marginX + cardWidth - rowPaddingX, y, { align: "right" });

      // Divider between rows (skip after the last one)
      if (i < rowsData.length - 1) {
        doc.setDrawColor(...BORDER_LIGHT);
        doc.setLineWidth(0.2);
        doc.line(marginX + rowPaddingX, y + 5, marginX + cardWidth - rowPaddingX, y + 5);
      }

      y += rowHeight;
    });

    // Amount highlight strip (extra emphasis, matches the modal's bold amount row)
    doc.setFillColor(245, 247, 255);
    doc.rect(marginX, cardBottom - 28, cardWidth, 20, "F");
    doc.setTextColor(...BRAND_COLOR);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Total Paid", marginX + rowPaddingX, cardBottom - 15);
    doc.text(formatGHS(selectedReceipt.amount_paid || 0), marginX + cardWidth - rowPaddingX, cardBottom - 15, {
      align: "right",
    });

    // Footer
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Thank you for your payment. This receipt was generated electronically.", marginX, cardBottom + 12);
    doc.text(
      `Generated: ${new Date().toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" })}`,
      marginX,
      cardBottom + 18
    );

    doc.save(`Receipt_${String(selectedReceipt.id).slice(0, 8)}.pdf`);
  };

  if (loading) return <AppShell title="Receipts">Loading your records...</AppShell>;
  if (!student) return <AppShell title="Receipts">Not signed in.</AppShell>;

  return (
    <AppShell title="Receipts" subtitle="View details of your successful payments.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {receipts.map((r: any) => (
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
              <StaticRow k="Amount Paid" v={formatGHS(selectedReceipt.amount_paid || 0)} />
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