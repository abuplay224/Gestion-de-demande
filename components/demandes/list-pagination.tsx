import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

const BTN = "min-h-11 gap-1.5 rounded-[11px] px-3.5 py-[9px] text-[13px]";

function PageButton({ page, disabled, children }: { page: number; disabled: boolean; children: React.ReactNode }) {
  if (disabled) {
    return (
      <Button type="button" variant="outline" size="none" disabled className={`${BTN} opacity-40`}>
        {children}
      </Button>
    );
  }
  return (
    <Link
      href={page === 1 ? "/demandes" : `/demandes?page=${page}`}
      className={buttonVariants({ variant: "outline", size: "none", className: BTN })}
    >
      {children}
    </Link>
  );
}

export function ListPagination({
  page,
  pages,
  total,
  pageSize,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 pt-1">
      <span className="text-[13px] text-doztra-muted">
        Page {page} sur {pages} · {from}–{to} sur {total}
      </span>
      <div className="flex gap-2">
        <PageButton page={page - 1} disabled={page <= 1}>
          <span aria-hidden="true">‹</span> Précédent
        </PageButton>
        <PageButton page={page + 1} disabled={page >= pages}>
          Suivant <span aria-hidden="true">›</span>
        </PageButton>
      </div>
    </nav>
  );
}
