import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { LayoutDashboard, CreditCard, History, ReceiptText, Bell, User, LogOut, Menu, ShieldCheck } from "lucide-react";
import { Logo } from "./Logo";
import { useAppContext } from "@/lib/AppContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/payment", label: "Make Payment", icon: CreditCard },
  { to: "/history", label: "Payment History", icon: History },
  { to: "/receipts", label: "Receipts", icon: ReceiptText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
] as const;

function NavItems({ onNavigate, role }: { onNavigate?: () => void; role?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { notifications } = useAppContext();
  const unread = notifications.filter((n) => !n.read).length;
  const visibleNavItems = NAV.filter((item) => { if (item.to === "/admin") return role?.toLowerCase() === "admin"; return true; });

  return (
    <nav className="flex flex-col gap-1 p-3">
      {visibleNavItems.map(({ to, label, icon: Icon }) => {
        const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
        return (
          <Link key={to} to={to} onClick={onNavigate}
            className={cn("group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground")}
          >
            <Icon className="h-4 w-4" />
            <span className="flex-1">{label}</span>
            {to === "/notifications" && unread > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">{unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate, student, onLogout }: { onNavigate?: () => void; student?: any; onLogout: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border"><Logo /></div>
      <div className="flex-1 overflow-y-auto">
        <NavItems onNavigate={onNavigate} role={student?.role} />
      </div>
      <div className="p-3 border-t border-sidebar-border space-y-3">
        <div className="flex items-center gap-3 rounded-lg bg-secondary/60 px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            {(student?.full_name ?? "U").split(" ").map((s: string) => s[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{student?.full_name ?? "User"}</div>
            <div className="truncate text-xs text-muted-foreground">{student?.index_number ?? ""}</div>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" /> Logout
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children, title, subtitle, actions }: { children: ReactNode; title?: string; subtitle?: string; actions?: ReactNode }) {
  const { student, loading, signOut } = useAppContext();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut();
  };

  if (isLoggingOut) return <div className="min-h-screen bg-background" />;
  if (loading) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarInner student={student} onLogout={handleLogout} />
      </aside>
      <div className="flex-1 md:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 md:px-8 md:py-5">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden"><Menu className="h-5 w-5" /></Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-72"><SidebarInner student={student} onLogout={handleLogout} /></SheetContent>
            </Sheet>
            <div className="flex-1 min-w-0">
              {title && <h1 className="text-xl md:text-2xl font-semibold tracking-tight truncate">{title}</h1>}
              {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </header>
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}