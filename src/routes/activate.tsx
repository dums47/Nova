import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs"; 

export const Route = createFileRoute("/activate")({
  head: () => ({
    meta: [
      { title: "Activate Account — Compssa Dues" },
      { name: "description", content: "Complete your account onboarding details." },
    ],
  }),
  component: ActivatePage,
});

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 6) s++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  if (pw.length >= 10) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

function ActivatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [message, setMessage] = useState<string | null>("Verifying your student session...");
  const [error, setError] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [cpw, setCpw] = useState("");
  const [show, setShow] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const s = useMemo(() => strength(pw), [pw]);
  const labels = ["Too weak", "Weak", "Good", "Strong", "Excellent"];
  const colors = ["bg-destructive", "bg-destructive", "bg-warning", "bg-primary", "bg-success"];

  const processingRef = useRef(false);

  const evaluateStudentStatus = async (user: any) => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    setLoading(true);
    setError(null);
    const email = user.email;
    setUserEmail(email ?? null);

    if (!email || !email.toLowerCase().endsWith("@htu.edu.gh")) {
      setError("Access denied. Please use an official @htu.edu.gh account.");
      await supabase.auth.signOut();
      setLoading(false);
      processingRef.current = false;
      return;
    }

    const { data: student, error: dbError } = await supabase
      .from("studenttable")
      .select("id, email, role, is_activated, auth_user_id")
      .eq("email", email)
      .maybeSingle();

    if (dbError || !student) {
      setError("No student record found. Please contact support.");
      setLoading(false);
      processingRef.current = false;
      return;
    }

    // Link Auth ID if missing
    if (!student.auth_user_id) {
      await supabase.from("studenttable").update({ auth_user_id: user.id }).eq("id", student.id);
    }

    if (student.is_activated) {
      navigate({ to: student.role === "admin" ? "/admin" : "/dashboard", replace: true });
      return;
    }

    setMessage("Account verified. Please set your portal password to continue.");
    setShowPasswordFields(true);
    setLoading(false);
    processingRef.current = false;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) evaluateStudentStatus(data.session.user);
      else navigate({ to: "/login", replace: true });
    });
  }, [navigate]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== cpw) return setError("Passwords do not match.");
    if (s < 2) return setError("Password is too weak.");
    
    setLoading(true);
    setError(null);

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(pw, salt);

    const { error: authError } = await supabase.auth.updateUser({ password: pw });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const { error: dbError } = await supabase
      .from("studenttable")
      .update({ is_activated: true, hash_password: hash })
      .eq("email", userEmail!);

    if (dbError) {
      setError("Failed to save credentials. Please try again.");
      setLoading(false);
      return;
    }

    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <AuthCard title="Account Activation" subtitle="Link your student profile and credentials safely.">
      <div className="space-y-5">
        {userEmail && <p className="text-sm font-medium text-slate-400">Profile: <span className="text-white">{userEmail}</span></p>}
        {message && !error && <p className="text-sm text-emerald-500">{message}</p>}
        {error && <p className="text-sm text-rose-600 font-medium">{error}</p>}

        {showPasswordFields ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="pw">New Password</Label>
              <div className="relative">
                <Input id="pw" type={show ? "text" : "password"} className="pr-10 h-11" value={pw} onChange={(e) => setPw(e.target.value)} required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpw">Confirm Password</Label>
              <Input id="cpw" type={show ? "text" : "password"} className="h-11" value={cpw} onChange={(e) => setCpw(e.target.value)} required />
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i < s ? colors[s - 1] : "bg-slate-800"}`} />
              ))}
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full gap-2 mt-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Activate & Open Dashboard
            </Button>
          </form>
        ) : (
          loading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        )}
      </div>
    </AuthCard>
  );
}