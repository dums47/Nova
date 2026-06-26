import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset Password — Compssa Dues" }] }),
  component: ForgotPasswordPage,
});

const HTU_EMAIL_DOMAIN = /@htu\.edu\.gh$/i;

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!HTU_EMAIL_DOMAIN.test(email)) {
      setError("Please use a valid @htu.edu.gh email address.");
      return;
    }

    setLoading(true);

    try {
      // 1. Verify if the student exists in your database first
      const { data: student, error: dbError } = await supabase
        .from("studenttable")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (dbError) throw new Error("Connection error, please try again.");
      if (!student) throw new Error("No student record found with this email.");

      // 2. Trigger Supabase Password Reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`, // Make sure you have this route
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Reset password" subtitle="Enter your institutional email and we'll send you a link to reset your password.">
      {success ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-emerald-600 font-medium">
            Password reset link sent! Please check your email inbox.
          </p>
          <Link to="/login" className="flex items-center justify-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleResetRequest} className="space-y-5">
          {error ? <p className="text-sm text-rose-600 font-medium">{error}</p> : null}
          
          <div className="space-y-2">
            <Label htmlFor="email">Institutional Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-10 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@htu.edu.gh"
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="h-11 w-full gap-2 shadow-elegant">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Sending link...</>
            ) : (
              "Send reset link"
            )}
          </Button>
          
          <div className="text-center">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Remembered your password? Sign in
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}