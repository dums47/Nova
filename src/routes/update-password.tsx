import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock } from "lucide-react";
import { AuthCard } from "@/components/AuthCard";
import { supabase } from "@/lib/supabase";
import bcrypt from "bcryptjs";

export const Route = createFileRoute("/update-password")({
  head: () => ({ meta: [{ title: "Update Password — Compssa Dues" }] }),
  component: UpdatePasswordPage,
});

function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      // 1. Update the password in Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError) throw authError;

      // 2. Hash the new password and update your studenttable
      // We get the email from the current authenticated user (who just logged in via the link)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user?.email) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);

        const { error: dbError } = await supabase
          .from("studenttable")
          .update({ hash_password: hash })
          .eq("email", user.email);

        if (dbError) throw dbError;
      }

      setLoading(false);
      navigate({ to: "/dashboard", replace: true });
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Set new password" subtitle="Enter your new password below.">
      <form onSubmit={handleUpdate} className="space-y-5">
        {error ? <p className="text-sm text-rose-600 font-medium">{error}</p> : null}

        <div className="space-y-2">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              className="pl-10 h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full gap-2 shadow-elegant">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : "Update Password"}
        </Button>
      </form>
    </AuthCard>
  );
}