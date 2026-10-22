import type { Metadata } from "next";
import { Suspense } from "react";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UsersList } from "@/components/admin/users-list";
import { AppHeader, PageTitle } from "@/components/demandes/app-header";
import { ListSkeleton } from "@/components/demandes/list-states";
import { plural } from "@/lib/format";
import { requirePageUser } from "@/lib/session";
import { listUsers } from "@/server/queries/list-users";

export const metadata: Metadata = { title: "Utilisateurs — Doztra" };

const CARD = "flex min-w-0 flex-col gap-[18px] rounded-[clamp(18px,2.4vw,24px)] bg-white p-[clamp(14px,2.2vw,24px)]";

async function Users() {
  const me = await requirePageUser({ admin: true }); // agent → /demandes
  const users = await listUsers();
  const admins = users.filter((u) => u.role === "admin" && u.active).length;
  return (
    <>
      <p className="m-0 text-[13px] text-doztra-muted">
        {plural(users.length, "compte")} · {plural(admins, "administrateur")} actif{admins > 1 ? "s" : ""}
      </p>
      <UsersList users={users} meId={me.id} />
    </>
  );
}

export default function UtilisateursPage() {
  return (
    <>
      <AppHeader section="utilisateurs">
        <div className="flex flex-col gap-2">
          <PageTitle>Utilisateurs</PageTitle>
          <p className="m-0 text-sm text-doztra-night-muted">
            Les agents saisissent, consultent et priorisent les demandes ; les administrateurs gèrent aussi les comptes.
          </p>
        </div>
      </AppHeader>
      <section aria-labelledby="new-user" className={CARD}>
        <div className="flex flex-col gap-[3px]">
          <h2 id="new-user" className="m-0 text-[17px] font-extrabold">
            Nouveau compte
          </h2>
          <p className="m-0 text-[13px] text-doztra-muted">
            Communiquez le mot de passe provisoire à la personne par un canal sûr.
          </p>
        </div>
        <CreateUserForm />
      </section>
      <main className={CARD}>
        <h2 className="m-0 text-[17px] font-extrabold">Comptes de l’équipe</h2>
        <Suspense fallback={<ListSkeleton />}>
          <Users />
        </Suspense>
      </main>
    </>
  );
}
