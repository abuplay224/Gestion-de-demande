import { cn } from "cn";
import { Badge } from "@/components/ui/badge";

/** Priorité signalée par un texte et un symbole, jamais par la couleur seule. */
export function PriorityBadge({ isPriority, className }: { isPriority: boolean; className?: string }) {
  return (
    <Badge
      className={cn(
        "h-auto gap-1.5 rounded-full px-[11px] py-[5px] text-[12.5px] font-bold",
        isPriority ? "bg-doztra-prio-bg text-doztra-prio-fg" : "bg-doztra-normal-bg text-doztra-muted-2",
        className
      )}
    >
      <span aria-hidden="true" className="font-glyph">
        {isPriority ? "★" : "○"}
      </span>
      {isPriority ? "Prioritaire" : "Normale"}
    </Badge>
  );
}
