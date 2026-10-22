import { cn } from "cn";

export type ToastState = { text: string; kind: "ok" | "err"; key: number };

export function Toast({ text, kind }: Omit<ToastState, "key">) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-60 flex justify-center px-4">
      <div
        className={cn(
          "flex max-w-[calc(100vw-32px)] animate-toast-in items-center gap-2.5 rounded-[14px] px-[18px] py-[13px] text-sm font-bold text-white shadow-[0_16px_40px_-12px_rgba(0,0,0,.45)]",
          kind === "ok" ? "bg-doztra-ink" : "bg-doztra-prio-fg"
        )}
      >
        <span
          aria-hidden="true"
          className="grid size-[22px] flex-none place-items-center rounded-full bg-white/18 text-xs"
        >
          {kind === "ok" ? "✓" : "!"}
        </span>
        {text}
      </div>
    </div>
  );
}
