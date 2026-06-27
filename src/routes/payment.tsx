import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatGHS, genRef } from "@/lib/store";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/useAuth";
import { useAppData } from "@/lib/useAppData";

const FEE_RATE = 0.015;
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

export const Route = createFileRoute("/payment")({
  head: () => ({ meta: [{ title: "Make Payment — Compssa Dues" }] }),
  component: PaymentPage,
});

function PaymentPage() {
  const navigate = useNavigate();
  const { student, balances, fees } = useAppData();
  const { user: authUser, session } = useAuth();
  const b = balances;
  const authUserId = authUser?.auth_user_id ?? session?.user?.id ?? null;
  console.log("DEBUG: authUser object:", authUser);
  console.log("DEBUG: session object:", session);
  console.log("DEBUG: Resolved authUserId:", authUserId);

  const [mode, setMode] = useState<"half" | "full" | "custom" | "all">("half");
  const [custom, setCustom] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MIN_CUSTOM_PAYMENT = 50;

  const amount = useMemo(() => {
    if (mode === "half") return 50;
    if (mode === "full") return 100;
    if (mode === "all") return b.outstanding;
    const sanitized = custom.trim().replace(/,/g, "");
    const n = Number(sanitized);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [mode, custom, b.outstanding]);

  const fee = Math.round(amount * FEE_RATE * 100) / 100;
  const total = Math.round((amount + fee) * 100) / 100;

  const pay = async () => {
    console.log("1. Pay button clicked");
    setError(null);
    setLoading(true);

    // This is the function logic that Paystack requires as a valid callback
    const handleSuccess = async (res: { reference: string }) => {
      try {
        const { error } = await supabase.functions.invoke('verify-paystack', {
          body: { 
           reference: res.reference, 
        amount: total, 
        fee_id: fees?.[0]?.id, 
        index_number: student?.index_number, 
        auth_user_id: authUserId
          }
        });

        if (error) throw error;
        navigate({ to: "/payment-success", search: { ref: res.reference, amount: total } });
      } catch (err) {
        console.error("Database save failed:", err);
        setError("Payment succeeded, but we couldn't save it.");
        setLoading(false);
      }
    };

    try {
      if (!window.PaystackPop) {
        console.log("2. Loading script manually...");
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://js.paystack.co/v1/inline.js";
          script.onload = () => { console.log("3. Script loaded"); resolve(); };
          script.onerror = () => { console.error("3. Script load error"); reject(); };
          document.body.appendChild(script);
        });
      } else {
        console.log("2. Script already exists");
      }

      console.log("4. Setting up handler with key:", PAYSTACK_PUBLIC_KEY ? "Present" : "Missing");

      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: authUser?.email || "test@example.com",
        amount: Math.round(total * 100),
        currency: "GHS",
        ref: genRef(),
        // We wrap the call so Paystack receives a stable function
        callback: (res: any) => handleSuccess(res),
        onClose: () => {
          console.log("Closed");
          setLoading(false);
        },
      });

      console.log("5. Attempting to open iframe...");
      handler.openIframe();
    } catch (err) {
      console.error("FATAL ERROR:", err);
      setError("Failed to open. Check Console.");
      setLoading(false);
    }
  };

  const options = [
    { id: "half", title: "Half Payment", amount: 50, desc: "Pay half of one level's dues" },
    { id: "full", title: "Full Payment", amount: 100, desc: "Pay one full level (GHS 100)" },
    { id: "custom", title: "Custom Amount", amount: 0, desc: "Choose any amount" },
    { id: "all", title: "Clear All", amount: b.outstanding, desc: "Settle your full outstanding balance" },
  ] as const;

  return (
    <AppShell title="Make a payment" subtitle="Choose how much you want to pay today.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary to-accent p-6 text-primary-foreground shadow-elegant">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest opacity-80">Outstanding balance</div>
                <div className="mt-2 text-4xl font-bold">{formatGHS(b.outstanding)}</div>
              </div>
              <div className="hidden md:block h-20 w-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
                <CreditCard className="h-9 w-9 m-auto mt-5" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Payment options</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {options.map((o) => {
                const active = mode === o.id;
                return (
                  <button key={o.id} type="button" onClick={() => setMode(o.id as typeof mode)} className={`text-left rounded-xl border p-4 transition ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
                    <div className="font-semibold">{o.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{o.desc}</div>
                    {o.id !== "custom" && <div className="mt-3 text-lg font-bold text-foreground">{formatGHS(o.amount)}</div>}
                  </button>
                );
              })}
            </div>
            {mode === "custom" && (
              <div className="mt-4 space-y-2">
                <Label htmlFor="amount">Custom amount (GHS)</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="h-11 text-lg"
                />
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-6 shadow-soft h-fit">
          <h2 className="text-lg font-semibold">Payment summary</h2>
          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
          <Button onClick={pay} disabled={loading} className="mt-6 h-14 w-full gap-2 text-base font-semibold">
            {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Processing…</> : <>Pay {formatGHS(total)} with Paystack</>}
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Secured by Paystack • PCI-DSS
          </div>
        </aside>
      </div>
    </AppShell>
  );
}