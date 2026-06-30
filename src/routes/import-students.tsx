import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { Upload, UserPlus, CheckCircle2, XCircle, Loader2, FileText, X, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/import-students")({
  head: () => ({ meta: [{ title: "Import Students — Compssa Dues" }] }),
  component: ImportStudentsPage,
});

type ResultRow = { index_number: string; status: "success" | "error"; message: string };
type StudentRow = {
  id: string;
  full_name: string;
  index_number: string;
  email: string;
  current_level: number;
  department_id: number | null;
};

const EMPTY_FORM = {
  full_name: "",
  index_number: "",
  email: "",
  current_level: "",
  department_id: "",
};

const ALLOWED_EMAIL_DOMAIN = "@htu.edu.gh";

function isAllowedEmail(email: string) {
  return email.trim().toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

function ImportStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);
    const { data, error } = await supabase
      .from("studenttable")
      .select("id, full_name, index_number, email, current_level, department_id")
      .order("full_name", { ascending: true });

    if (!error && data) {
      setStudents(data as StudentRow[]);
    }
    setStudentsLoading(false);
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResults, setCsvResults] = useState<ResultRow[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [singleLoading, setSingleLoading] = useState(false);
  const [singleSuccess, setSingleSuccess] = useState<string | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setCsvFile(file);
    setCsvResults([]);
    setCsvError(null);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setCsvLoading(true);
    setCsvError(null);
    setCsvResults([]);

    try {
      const text = await csvFile.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
      const rows = lines.slice(1);
      const results: ResultRow[] = [];

      for (const row of rows) {
        if (!row.trim()) continue;

        const values = row.split(",").map((v) => v.trim());
        const record: Record<string, string> = {};
        headers.forEach((h, i) => (record[h] = values[i] ?? ""));

        const index_number = record["index_number"] ?? record["index number"] ?? "";
        if (!index_number) continue;

        const email = record["email"] ?? "";

        if (!email) {
          results.push({ index_number, status: "error", message: "Missing email." });
          continue;
        }
        if (!isAllowedEmail(email)) {
          results.push({
            index_number,
            status: "error",
            message: `Rejected: email must end with ${ALLOWED_EMAIL_DOMAIN}`,
          });
          continue;
        }

        const rawDept = record["department_id"] ?? record["department"] ?? "";
        const rawLevel = record["current_level"] ?? record["level"] ?? "";

        try {
          const { error } = await supabase.from("studenttable").upsert(
            {
              email,
              full_name: record["full_name"] ?? record["full name"] ?? "",
              current_level: rawLevel ? Number(rawLevel) : 100,
              department_id: rawDept ? Number(rawDept) : null,
              index_number,
            },
            { onConflict: "index_number" }
          );

          results.push({
            index_number,
            status: error ? "error" : "success",
            message: error ? error.message : "Imported successfully",
          });
        } catch (err: any) {
          results.push({ index_number, status: "error", message: err.message ?? "Unknown error" });
        }
      }

      setCsvResults(results);

      if (results.some((r) => r.status === "success")) {
        await fetchStudents();
      }
    } catch {
      setCsvError("Failed to parse CSV. Please check the file format.");
    } finally {
      setCsvLoading(false);
    }
  };

  const handleSingleSubmit = async () => {
    setSingleError(null);
    setSingleSuccess(null);

    if (!form.full_name || !form.index_number || !form.email) {
      setSingleError("Full name, index number and email are required.");
      return;
    }

    if (!isAllowedEmail(form.email)) {
      setSingleError(`Email must be an ${ALLOWED_EMAIL_DOMAIN} address.`);
      return;
    }

    setSingleLoading(true);
    try {
      const { error } = await supabase.from("studenttable").upsert(
        {
          full_name: form.full_name.trim(),
          index_number: form.index_number.trim(),
          email: form.email.trim(),
          current_level: Number(form.current_level) || 100,
          department_id: form.department_id ? Number(form.department_id) : null,
        },
        { onConflict: "index_number" }
      );

      if (error) throw error;

      setSingleSuccess(`Student "${form.full_name}" added successfully.`);
      setForm(EMPTY_FORM);

      await fetchStudents();
    } catch (err: any) {
      setSingleError(err.message ?? "Failed to add student.");
    } finally {
      setSingleLoading(false);
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setForm(EMPTY_FORM);
    setSingleError(null);
    setSingleSuccess(null);
  };

  const closeCsvModal = () => {
    setShowCsvModal(false);
    setCsvFile(null);
    setCsvResults([]);
    setCsvError(null);
  };

  const successCount = csvResults.filter((r) => r.status === "success").length;
  const errorCount = csvResults.filter((r) => r.status === "error").length;

  return (
    <AppShell
      title="Students"
      subtitle="Manage and import students."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={fetchStudents} disabled={studentsLoading} title="Refresh list">
            <RefreshCw className={`h-4 w-4 ${studentsLoading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setShowCsvModal(true)}>
            <Upload className="h-4 w-4" /> Upload CSV
          </Button>
          <Button className="gap-2" onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4" /> Add Student
          </Button>
        </div>
      }
    >
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="p-4 md:p-6 border-b border-border">
          <h2 className="text-lg font-semibold">List of students</h2>
          <p className="text-sm text-muted-foreground">
            {studentsLoading ? "Loading…" : `${students.length} registered students`}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left font-medium">Full Name</th>
                <th className="px-6 py-3 text-left font-medium">Index Number</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Level</th>
                <th className="px-6 py-3 text-left font-medium">Department ID</th>
              </tr>
            </thead>
            <tbody>
              {!studentsLoading && students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    No students yet. Import a CSV or add one manually.
                  </td>
                </tr>
              )}
              {students.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-secondary/30 transition">
                  <td className="px-6 py-4 font-medium">{s.full_name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{s.index_number}</td>
                  <td className="px-6 py-4 text-muted-foreground">{s.email}</td>
                  <td className="px-6 py-4">Level {s.current_level}</td>
                  <td className="px-6 py-4 text-muted-foreground">{s.department_id ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Add New Student</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeAddModal}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="full_name">Full name <span className="text-rose-500">*</span></Label>
                  <Input
                    id="full_name"
                    placeholder="e.g. John Doe"
                    value={form.full_name}
                    onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email <span className="text-rose-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="e.g. john@htu.edu.gh"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="index_number">Index number <span className="text-rose-500">*</span></Label>
                <Input
                  id="index_number"
                  placeholder="e.g. UGR/0000/00"
                  value={form.index_number}
                  onChange={(e) => setForm((p) => ({ ...p, index_number: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="current_level">Level</Label>
                  <Input
                    id="current_level"
                    placeholder="e.g. 200"
                    inputMode="numeric"
                    value={form.current_level}
                    onChange={(e) => setForm((p) => ({ ...p, current_level: e.target.value.replace(/\D/g, "") }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="department_id">Department ID</Label>
                  <Input
                    id="department_id"
                    placeholder="e.g. 1"
                    inputMode="numeric"
                    value={form.department_id}
                    onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value.replace(/\D/g, "") }))}
                  />
                </div>
              </div>

              {singleError && <p className="text-sm text-rose-600">{singleError}</p>}
              {singleSuccess && (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> {singleSuccess}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={closeAddModal}>Cancel</Button>
              <Button className="flex-1 gap-2" onClick={handleSingleSubmit} disabled={singleLoading}>
                {singleLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</> : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Upload CSV</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={closeCsvModal}
                className="text-muted-foreground hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-xl border-2 border-dashed border-border bg-secondary/30 p-6 text-center">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-1">
                  CSV must include:
                </p>
                <p className="font-mono text-xs text-muted-foreground mb-1">
                  email,full_name, current_level, department_id,index_number
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Only {ALLOWED_EMAIL_DOMAIN} emails will be imported.
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                  {csvFile ? csvFile.name : "Choose CSV file"}
                </Button>
              </div>

              {csvError && <p className="text-sm text-rose-600">{csvError}</p>}

              {csvResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex gap-4 text-sm font-medium">
                    <span className="text-green-600">{successCount} imported</span>
                    {errorCount > 0 && <span className="text-rose-600">{errorCount} failed</span>}
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {csvResults.map((r, i) => (
                      <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${r.status === "success" ? "bg-green-50 text-green-700" : "bg-rose-50 text-rose-700"}`}>
                        {r.status === "success"
                          ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                          : <XCircle className="h-4 w-4 shrink-0" />}
                        <span className="font-mono font-medium">{r.index_number}</span>
                        <span className="text-xs opacity-80">— {r.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <Button variant="outline" className="flex-1" onClick={closeCsvModal}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleCsvUpload}
                disabled={csvLoading || !csvFile}
              >
                {csvLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Importing…</> : <><Upload className="h-4 w-4" /> Import</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

export default ImportStudentsPage;