import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/lib/AppContext"; // Use this
import { supabase } from "@/lib/supabase";
import { Save } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Profile — Compssa Dues" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  // Use ONLY the context. Remove useAppData() entirely.
  const { student, loading } = useAppContext();
  const [fullName, setFullName] = useState("");
  const [studentId, setStudentId] = useState("");

  useEffect(() => {
    if (student) {
      setFullName(student.full_name ?? "");
      setStudentId(student.index_number ?? "");
    }
  }, [student]);

  // AppShell handles its own loading state, so you don't need double logic here.
  if (loading) return <AppShell title="Profile">Loading…</AppShell>;
  if (!student) return <AppShell title="Profile">Not signed in.</AppShell>;

  return (
    <AppShell title="Profile" subtitle="Manage your account details.">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
              {student.full_name.split(" ").map((p: string) => p[0]).join("").slice(0, 2)}
            </div>
            <div className="mt-4 text-lg font-semibold">{student.full_name}</div>
            <div className="text-sm text-muted-foreground">{student.index_number ?? "No ID set"}</div>
            {/* Note: department is available via student.department.name */}
            <div className="mt-4 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {/* @ts-ignore */}
              {student.department?.name ?? "N/A"} • Level {student.current_level}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="text-lg font-semibold">Account information</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Index number</Label>
                <Input value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                {/* @ts-ignore */}
                <Input value={student.department?.name ?? "N/A"} disabled className="h-11" />
              </div>
            </div>
            <Button
              onClick={async () => {
                const { error } = await supabase
                  .from("studenttable")
                  .update({ full_name: fullName, index_number: studentId })
                  .eq("id", student.id);
                
                if (!error) alert("Profile updated successfully!");
              }}
              className="mt-5 gap-2 shadow-elegant"
            >
              <Save className="h-4 w-4" /> Save changes
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}