import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/demandes/app-header";
import { ListHero } from "@/components/demandes/list-hero";
import { ListSkeleton } from "@/components/demandes/list-states";
import { RequestsSection } from "@/components/demandes/requests-section";

export const metadata: Metadata = { title: "Demandes clients — Doztra" };

export default function DemandesPage({ searchParams }: PageProps<"/demandes">) {
  return (
    <>
      <AppHeader section="demandes">
        <ListHero />
      </AppHeader>
      <main className="flex min-w-0 flex-col gap-[18px] rounded-[clamp(18px,2.4vw,24px)] bg-white p-[clamp(14px,2.2vw,24px)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-[3px]">
            <h2 className="m-0 text-[17px] font-extrabold">Registre des demandes</h2>
            <p className="m-0 text-[13px] text-doztra-muted">Prioritaires d’abord, puis les plus récentes</p>
          </div>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <RequestsSection searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
