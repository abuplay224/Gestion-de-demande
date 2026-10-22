import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

/** En-tête sombre commun aux écrans ; `children` reçoit le bloc titre propre à l’écran. */
export function AppHeader({ children }: { children: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-[clamp(22px,3.6vw,40px)] rounded-[clamp(18px,2.4vw,26px)] bg-doztra-night bg-[radial-gradient(120%_140%_at_100%_0%,var(--color-doztra-night-2)_0%,var(--color-doztra-night)_60%)] p-[clamp(16px,2.6vw,28px)] text-white">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-[34px] place-items-center rounded-[10px] bg-doztra-primary text-[17px] font-extrabold text-white">
            D
          </div>
          <span className="text-[17px] font-extrabold tracking-[-0.01em]">Doztra</span>
        </div>
        <nav aria-label="Navigation principale" className="hidden gap-1.5 min-[960px]:flex">
          <Link
            href="/demandes"
            className={buttonVariants({ variant: "night", size: "none", className: "rounded-[11px] px-4 py-[9px] text-[13px] font-semibold" })}
          >
            Demandes
          </Link>
        </nav>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-[13px] text-doztra-night-muted min-[960px]:inline">
            Équipe Doztra
          </span>
          <div
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-full border-[1.5px] border-doztra-night-border bg-doztra-night-avatar text-xs font-bold text-doztra-night-soft"
          >
            AB
          </div>
        </div>
      </div>
      {children}
    </header>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="m-0 text-[clamp(28px,5.4vw,40px)] leading-[1.05] font-extrabold tracking-[-0.025em]">
      {children}
    </h1>
  );
}
