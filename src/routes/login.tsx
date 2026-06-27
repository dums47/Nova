import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Loader2, Mail, Globe } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import { useAppContext } from "@/lib/AppContext";
import { toast, Toaster } from "sonner"; // Added for the activation toast

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Compssa Dues" }] }),
  component: LoginPage,
});

const HTU_EMAIL_DOMAIN = /@htu\.edu\.gh$/i;

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to show the activation prompt
  const showActivationToast = () => {
    toast.info("Account Activation", {
      description: "Please use the 'Continue with Google' button below to activate your account.",
      duration: 6000,
    });
  };

  useEffect(() => {
    handleExistingSession();
  }, []);

  const handleExistingSession = async () => {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user;
    if (!user) return;
    if (!HTU_EMAIL_DOMAIN.test(user.email ?? "")) {
      setError("Access denied. Please sign in with an @htu.edu.gh email address.");
      await supabase.auth.signOut();
      return;
    }
    await redirectAfterSignIn(user.email ?? "", user.id);
  };

  const findStudent = async (email: string, userId?: string) => {
    if (userId) {
      const { data: student, error } = await supabase
        .from("studenttable")
        .select("id, role, is_activated, auth_user_id")
        .eq("auth_user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (student) return student;
    }

    const { data: studentByEmail, error: emailError } = await supabase
      .from("studenttable")
      .select("id, role, is_activated, auth_user_id")
      .eq("email", email)
      .maybeSingle();
    if (emailError) throw emailError;
    return studentByEmail;
  };

  const redirectAfterSignIn = async (email: string, userId: string) => {
    if (!HTU_EMAIL_DOMAIN.test(email)) {
      setError("Access denied. Please sign in with an @htu.edu.gh email address.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    try {
      const student = await findStudent(email, userId);
      if (!student) {
        setError("No matching student profile found. Please contact administration.");
        setLoading(false);
        await supabase.auth.signOut();
        return;
      }

      if (!student.auth_user_id) {
        await supabase.from("studenttable").update({ auth_user_id: userId }).eq("id", student.id);
      }

      if (!student.is_activated) {
        setLoading(false);
        navigate({ to: "/activate", replace: true });
        return;
      }

      if (student.role === "admin") {
        navigate({ to: "/admin", replace: true });
      } else {
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: any) {
      setError(err?.message ?? "An unexpected error occurred.");
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !pw) {
      setError("Enter your email and password.");
      return;
    }
    if (!HTU_EMAIL_DOMAIN.test(email)) {
      setError("Access denied. Please sign in with an @htu.edu.gh email address.");
      return;
    }
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    if (authError || !data.user) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    try {
      const student = await findStudent(email, data.user.id);

      if (!student || !student.is_activated) {
        await supabase.auth.signOut();
        setError("Account not activated. Please use the 'Continue with Google' button to activate your account.");
        setLoading(false);
        return;
      }

      await redirectAfterSignIn(email, data.user.id);
    } catch (err: any) {
      await supabase.auth.signOut();
      setError("Error verifying activation status. Please try again.");
      setLoading(false);
    }
  };

  const { signInWithGoogle } = useAppContext();

  const continueWithGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/activate`,
          queryParams: { prompt: 'select_account' }
        },
      });

      if (authError) throw authError;
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to manage your departmental dues">
      <Toaster position="top-center" richColors />
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" className="pl-10 h-11" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">Password</Label>
            <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <Input id="pw" type={show ? "text" : "password"} className="pr-10 h-11" value={pw} onChange={(e) => setPw(e.target.value)} required />
            <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error ? <p className="text-sm text-rose-600 font-medium">{error}</p> : null}
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <Checkbox id="remember" defaultChecked /> Remember me on this device
        </label>
        <Button type="submit" disabled={loading} className="h-11 w-full gap-2 shadow-elegant">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : "Sign in"}
        </Button>
      </form>
      <div className="mt-6 text-center text-sm text-muted-foreground">or</div>
      <Button onClick={continueWithGoogle} disabled={loading} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white hover:brightness-110 h-11">
        <Globe className="h-4 w-4" />
        {loading ? "Redirecting to Google…" : "Continue with Google"}
      </Button>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        New here?{" "}
        <button onClick={showActivationToast} className="font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0">
          Activate your account
        </button>
      </p>
    </AuthCard>
  );
}