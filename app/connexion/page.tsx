import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/sign-in-form";
import { AppHeader, PageTitle } from "@/components/demandes/app-header";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion — Doztra" };

async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  if (await getCurrentUser()) redirect("/demandes"); // déjà connecté
  const { next } = await searchParams;
  return <SignInForm next={typeof next === "string" ? next : ""} />;
}

export default function ConnexionPage({ searchParams }: PageProps<"/connexion">) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1320px] flex-col gap-[clamp(12px,2vw,20px)] p-[clamp(10px,2.4vw,24px)]">
      <AppHeader>
        <div className="flex flex-col gap-3">
          <PageTitle>Connexion</PageTitle>
          <p className="m-0 text-sm text-doztra-night-muted">
            Accès réservé aux collaborateurs Doztra. Les comptes sont créés par un administrateur.
          </p>
        </div>
      </AppHeader>
      <main className="w-full max-w-[480px] self-center rounded-[clamp(18px,2.4vw,24px)] bg-white p-[clamp(16px,3vw,32px)]">
        <Suspense>
          <SignIn searchParams={searchParams} />
        </Suspense>
      </main>
    </div>
  );
}
