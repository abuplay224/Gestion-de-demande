import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppHeader, PageTitle } from "@/components/demandes/app-header";
import { RequestForm } from "@/components/demandes/request-form";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Nouvelle demande — Doztra" };

// UUID de soumission généré côté serveur à l’ouverture du formulaire (RG7)
async function FormWithSubmissionId() {
  await connection();
  await requireUser();
  return <RequestForm submissionId={crypto.randomUUID()} />;
}

export default function NouvelleDemandePage() {
  return (
    <>
      <AppHeader>
        <div className="flex flex-col gap-3">
          <Button
            variant="night"
            size="none"
            nativeButton={false}
            render={<Link href="/demandes" />}
            className="min-h-9 gap-2 self-start rounded-[10px] px-3.5 py-2 text-[13px] font-semibold text-doztra-night-soft hover:text-doztra-night-soft"
          >
            <span aria-hidden="true">←</span> Demandes
          </Button>
          <PageTitle>Nouvelle demande</PageTitle>
          <p className="m-0 text-sm text-doztra-night-muted">
            Les champs marqués d’un astérisque (*) sont obligatoires.
          </p>
        </div>
      </AppHeader>
      <main className="w-full max-w-[820px] self-center rounded-[clamp(18px,2.4vw,24px)] bg-white p-[clamp(16px,3vw,32px)]">
        <Suspense>
          <FormWithSubmissionId />
        </Suspense>
      </main>
    </>
  );
}
