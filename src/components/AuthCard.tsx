import { ReactNode } from "react";
import { Logo } from "./Logo";

export function AuthCard({ title, subtitle, children, className = "" }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-h-screen grid lg:grid-cols-2 bg-background ${className}`}>
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">

            {/* Logo centered */}
            <div className="flex flex-col items-center mb-8">
              <Logo className="h-30 w-auto" animate />
            </div>

            {/* Welcome message */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
              {children}
            </div>
          </div>
        </div>
      </div>

      <div
        className="hidden lg:block relative overflow-hidden"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
          <div className="text-sm uppercase tracking-widest opacity-80">Compssa Department • Dues Portal</div>
          <div>
            <blockquote className="text-2xl font-semibold leading-snug">
              "Paying my departmental dues took less than 10 seconds. The system is fast, simple, and secure."
            </blockquote>
            <div className="mt-6 text-sm opacity-90"> - Compssa Student</div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur"><div className="text-xl font-bold">2.4k+</div>Students</div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur"><div className="text-xl font-bold">99.9%</div>Uptime</div>
            <div className="rounded-xl bg-white/10 p-4 backdrop-blur"><div className="text-xl font-bold">PCI-DSS</div>Secure</div>
          </div>
        </div>
      </div>
    </div>
  );
}