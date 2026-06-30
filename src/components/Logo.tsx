import logpng from "@/assets/log.png";

export function Logo({ className = "h-30 w-auto", showText = false, animate = false }: { className?: string; showText?: boolean; animate?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logpng}
        alt="Compssa Dues"
        className={`${className} ${animate ? "animate-logo" : ""}`}
      />
    </div>
  );
}