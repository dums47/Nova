import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { formatGHS } from "@/lib/store";
import { CheckCircle2, Download, History } from "lucide-react";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const search = z.object({
  ref: z.string().optional(),
  amount: z.coerce.number().optional(),
});

export const Route = createFileRoute("/payment-success")({
  head: () => ({ meta: [{ title: "Payment Successful — Compssa Dues" }] }),
  validateSearch: search,
  component: SuccessPage,
});

function SuccessPage() {
  const { ref = "N/A", amount = 0 } = Route.useSearch();
  const [txn, setTxn] = useState<{ id: string } | null>(null);

  useEffect(() => {
    if (ref === "N/A") return;

    const fetchTransaction = async () => {
      // Because the trigger handles receipt creation immediately on insert,
      // we only need to fetch the transaction details.
      const { data, error } = await supabase
        .from("transactions")
        .select("id")
        .eq("paystack_reference", ref)
        .maybeSingle();

      if (error) {
        console.error("Error fetching transaction:", error);
      } else {
        setTxn(data);
      }
    };

    fetchTransaction();
  }, [ref]);

  return (
    <AppShell title="Payment successful">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-border bg-card p-8 md:p-12 shadow-card text-center">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-success/15 animate-ping" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-success/20 text-success">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight">Payment successful</h1>
          <p className="mt-2 text-muted-foreground">
            Thank you. Your dues payment has been received and recorded.
          </p>

          <div className="mt-8 rounded-xl bg-secondary/50 p-6 text-left">
            <Row k="Amount paid" v={<span className="font-bold text-foreground">{formatGHS(amount)}</span>} />
            <div className="my-3 h-px bg-border" />
            <Row k="Transaction ID" v={<span className="font-mono text-sm">{txn?.id || "Processing..."}</span>} />
            <div className="my-3 h-px bg-border" />
            <Row k="Reference" v={<span className="font-mono text-sm">{ref}</span>} />
            <div className="my-3 h-px bg-border" />
            <Row k="Date" v={new Date().toLocaleString("en-GH")} />
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/receipts">
              <Button className="gap-2 shadow-elegant">
                <Download className="h-4 w-4" /> Download receipt
              </Button>
            </Link>
            <Link to="/history">
              <Button variant="outline" className="gap-2">
                <History className="h-4 w-4" /> View history
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="ghost">Back to dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium">{v}</span>
    </div>
  );
}