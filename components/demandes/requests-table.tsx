import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fDate, fTime } from "@/lib/format";
import type { CustomerRequest } from "@/lib/types";
import { CustomerAvatar } from "./customer-avatar";
import { PriorityBadge } from "./priority-badge";
import { PriorityButton } from "./priority-button";

export type RowActions = {
  freshId: string | null;
  isPending: (id: string) => boolean;
  onToggle: (r: CustomerRequest) => void;
  onView: (r: CustomerRequest, trigger: HTMLElement) => void;
};

export function RequestsTable({ items, freshId, isPending, onToggle, onView }: { items: CustomerRequest[] } & RowActions) {
  return (
    // Colonnes de largeur égale, comme le rendu de référence du prototype
    <Table>
      <TableHeader>
        <tr>
          <TableHead scope="col">Client</TableHead>
          <TableHead scope="col">Objet</TableHead>
          <TableHead scope="col">Créée le</TableHead>
          <TableHead scope="col">Priorité</TableHead>
          <TableHead scope="col" className="text-right">
            Actions
          </TableHead>
        </tr>
      </TableHeader>
      <TableBody>
        {items.map((r) => (
          <TableRow key={r.id} className={r.id === freshId ? "bg-doztra-fresh" : "bg-transparent"}>
            <TableCell>
              <div className="flex min-w-0 items-center gap-[11px]">
                <CustomerAvatar id={r.id} name={r.customerName} />
                <span title={r.customerName} className="min-w-0 truncate font-bold">
                  {r.customerName}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div title={r.subject} className="truncate text-doztra-ink-2">
                {r.subject}
              </div>
            </TableCell>
            <TableCell className="whitespace-nowrap text-doztra-ink-2">
              <div className="font-semibold">{fDate.format(r.createdAt)}</div>
              <div className="text-[12.5px] text-doztra-muted">{fTime.format(r.createdAt)}</div>
            </TableCell>
            <TableCell>
              <PriorityBadge isPriority={r.isPriority} />
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <PriorityButton
                  layout="table"
                  isPriority={r.isPriority}
                  pending={isPending(r.id)}
                  onToggle={() => onToggle(r)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="none"
                  onClick={(e) => onView(r, e.currentTarget)}
                  aria-label={`Voir la demande de ${r.customerName}`}
                  className={cn(
                    "grid size-[38px] flex-none place-items-center rounded-[11px] text-base",
                    "hover:border-doztra-ink hover:bg-doztra-ink hover:text-white"
                  )}
                >
                  ↗
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
