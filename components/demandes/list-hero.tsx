import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { countRequests } from "@/server/queries/list-requests";
import { PageTitle } from "./app-header";

async function countLabel() {
  try {
    const { total, priority } = await countRequests();
    if (!total) return "Aucune demande enregistrée";
    return `${plural(total, "demande")} · ${plural(priority, "prioritaire")}`;
  } catch (e) {
    unstable_rethrow(e);
    return " ";
  }
}

async function CountLabel() {
  return <>{await countLabel()}</>;
}

export function ListHero() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-[18px]">
      <div className="flex min-w-0 flex-col gap-2">
        <PageTitle>Demandes clients</PageTitle>
        <p className="m-0 text-sm text-doztra-night-muted">
          <Suspense fallback={<>&nbsp;</>}>
            <CountLabel />
          </Suspense>
        </p>
      </div>
      <Link
        href="/demandes/nouvelle"
        className={buttonVariants({ size: "none", className: "min-h-12 max-w-[280px] flex-auto gap-2.5 rounded-[14px] px-[22px] py-3.5 text-[15px] shadow-[0_8px_24px_-8px_rgba(123,92,245,.7)]" })}
      >
        <span aria-hidden="true" className="text-xl leading-none font-medium">
          +
        </span>{" "}
        Ajouter une demande
      </Link>
    </div>
  );
}
