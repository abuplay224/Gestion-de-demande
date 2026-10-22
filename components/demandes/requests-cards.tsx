import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fDate, fTime } from "@/lib/format";
import type { CustomerRequest } from "@/lib/types";
import { CustomerAvatar } from "./customer-avatar";
import { PriorityBadge } from "./priority-badge";
import { PriorityButton } from "./priority-button";
import type { RowActions } from "./requests-table";

export function RequestsCards({ items, freshId, isPending, onToggle, onView }: { items: CustomerRequest[] } & RowActions) {
  return (
    <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3 p-0">
      {items.map((r) => (
        <li key={r.id} className="min-w-0">
          <Card
            className={cn(
              "h-full min-w-0 gap-3 rounded-[18px] border border-doztra-line-2 p-3.5 text-base ring-0 transition-colors duration-400",
              r.id === freshId ? "bg-doztra-fresh" : "bg-white"
            )}
          >
            <div className="flex min-w-0 items-center gap-[11px]">
              <CustomerAvatar id={r.id} name={r.customerName} className="size-[38px] text-[12.5px]" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] font-extrabold">{r.customerName}</span>
                <span className="text-[12.5px] text-doztra-muted">
                  {fDate.format(r.createdAt)} · {fTime.format(r.createdAt)}
                </span>
              </div>
              <PriorityBadge isPriority={r.isPriority} className="flex-none gap-[5px] px-2.5 text-xs" />
            </div>
            <div className="flex min-w-0 flex-col gap-[3px] rounded-xl bg-doztra-soft-2 px-[13px] py-[11px]">
              <span className="text-[11.5px] font-semibold text-doztra-muted">Objet</span>
              <span className="line-clamp-2 text-sm leading-[1.35] font-bold wrap-anywhere">{r.subject}</span>
            </div>
            <div className="flex gap-2">
              <PriorityButton
                layout="card"
                isPriority={r.isPriority}
                pending={isPending(r.id)}
                onToggle={() => onToggle(r)}
              />
              <Button
                type="button"
                variant="dark"
                size="none"
                onClick={(e) => onView(r, e.currentTarget)}
                aria-label={`Voir la demande de ${r.customerName}`}
                className="min-h-11 flex-none gap-1.5 rounded-xl px-4 py-2.5 text-[13px]"
              >
                Voir <span aria-hidden="true">↗</span>
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
