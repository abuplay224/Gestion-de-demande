import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryButton } from "./retry-button";

const SHIMMER =
  "animate-shimmer rounded-md bg-[linear-gradient(90deg,var(--color-doztra-skeleton)_0,var(--color-doztra-skeleton-hi)_50%,var(--color-doztra-skeleton)_100%)] bg-size-[800px_100%]";

export function ListSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2.5">
      <span className="sr-only">Chargement des demandes…</span>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3.5 rounded-[14px] bg-doztra-soft p-3.5">
          <Skeleton className={`size-9 flex-none rounded-full ${SHIMMER}`} />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className={`h-[11px] w-[38%] ${SHIMMER}`} />
            <Skeleton className={`h-2.5 w-[68%] ${SHIMMER}`} />
          </div>
          <Skeleton className="h-[26px] w-[86px] flex-none animate-none rounded-full bg-doztra-line-2" />
        </div>
      ))}
    </div>
  );
}

export function ListError() {
  return (
    <Alert className="flex flex-col items-center gap-3.5 rounded-[18px] border border-doztra-error-border bg-doztra-error-bg px-4 py-12 text-center">
      <div
        aria-hidden="true"
        className="grid size-12 place-items-center rounded-[14px] bg-doztra-error-chip text-[22px] font-extrabold text-doztra-error"
      >
        !
      </div>
      <div className="flex flex-col gap-1">
        <p className="m-0 text-base font-extrabold text-doztra-error-title">
          Impossible de charger les demandes
        </p>
        <p className="m-0 text-sm text-doztra-muted">Vérifiez votre connexion puis réessayez.</p>
      </div>
      <RetryButton />
    </Alert>
  );
}

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[18px] bg-doztra-soft px-4 py-14 text-center">
      <div
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl bg-doztra-primary-soft text-[26px] font-medium text-doztra-primary"
      >
        +
      </div>
      <div className="flex flex-col gap-1">
        <p className="m-0 text-[17px] font-extrabold">Aucune demande pour le moment</p>
        <p className="m-0 text-sm text-doztra-muted">
          Les demandes saisies par l’équipe apparaîtront ici.
        </p>
      </div>
      <Link
        href="/demandes/nouvelle"
        className={buttonVariants({ size: "none", className: "min-h-11 rounded-xl px-[22px] py-3 text-sm" })}
      >
        Ajouter une demande
      </Link>
    </div>
  );
}
