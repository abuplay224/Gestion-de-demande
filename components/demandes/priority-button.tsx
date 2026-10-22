import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { priorityLabel } from "./request-view";

type Props = {
  isPriority: boolean;
  pending: boolean;
  onToggle: () => void;
  /** table : bouton compact 38 px · card : bouton 44 px pleine largeur · sheet : bouton sombre du panneau */
  layout: "table" | "card" | "sheet";
};

const LAYOUTS = {
  table: "min-h-[38px] gap-[7px] rounded-[11px] px-3 py-2 text-[12.5px] hover:border-doztra-primary hover:text-doztra-accent",
  card: "min-h-11 flex-1 gap-[7px] rounded-xl px-3 py-2.5 text-[13px]",
  sheet: "min-h-[50px] w-full gap-2 rounded-[13px] p-3.5 text-[15px]",
};

export function PriorityButton({ isPriority, pending, onToggle, layout }: Props) {
  const dark = layout === "sheet";
  return (
    <Button
      type="button"
      variant={dark ? "dark" : "outline"}
      size="none"
      onClick={onToggle}
      disabled={pending}
      aria-busy={pending}
      className={cn(LAYOUTS[layout], pending && "opacity-55")}
    >
      <span
        aria-hidden="true"
        className={`font-glyph ${
          dark
            ? isPriority
              ? "text-doztra-night-muted"
              : "text-doztra-star-on-dark"
            : isPriority
              ? "text-doztra-muted"
              : "text-doztra-star"
        }`}
      >
        {isPriority ? "☆" : "★"}
      </span>
      {priorityLabel(isPriority, pending)}
    </Button>
  );
}
