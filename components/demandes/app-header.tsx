import Link from "next/link";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/session";
import { signOut } from "@/server/actions/auth";
import { initials } from "./request-view";

type Section = "demandes" | "utilisateurs";

const TAB = "rounded-[11px] px-4 py-[9px] text-[13px] font-semibold";

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={buttonVariants({
        variant: active ? "night" : "ghost",
        size: "none",
        className: active
          ? TAB
          : `${TAB} text-doztra-night-muted hover:bg-doztra-night-surface hover:text-white`,
      })}
    >
      {children}
    </Link>
  );
}

async function AdminTab({ active }: { active: boolean }) {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return null;
  return (
    <Tab href="/admin/utilisateurs" active={active}>
      Utilisateurs
    </Tab>
  );
}

const AVATAR =
  "grid size-9 flex-none place-items-center rounded-full border-[1.5px] border-doztra-night-border bg-doztra-night-avatar text-xs font-bold text-doztra-night-soft";

async function CurrentUser() {
  const user = await getCurrentUser();
  if (!user) return <div aria-hidden="true" className={AVATAR} />;
  return (
    <>
      <span className="hidden text-[13px] text-doztra-night-muted min-[960px]:inline">{user.name}</span>
      <div aria-hidden="true" title={user.name} className={AVATAR}>
        {initials(user.name)}
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className="min-h-9 rounded-[10px] px-3 text-[13px] font-semibold text-doztra-night-muted hover:bg-doztra-night-surface hover:text-white"
        >
          Déconnexion
        </button>
      </form>
    </>
  );
}

/**
 * En-tête sombre commun aux écrans ; `children` reçoit le bloc titre propre à l’écran.
 * Sans `section`, version réduite (page de connexion) : ni navigation ni utilisateur.
 */
export function AppHeader({ section, children }: { section?: Section; children: React.ReactNode }) {
  return (
    <header className="flex flex-col gap-[clamp(22px,3.6vw,40px)] rounded-[clamp(18px,2.4vw,26px)] bg-doztra-night bg-[radial-gradient(120%_140%_at_100%_0%,var(--color-doztra-night-2)_0%,var(--color-doztra-night)_60%)] p-[clamp(16px,2.6vw,28px)] text-white">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-[34px] place-items-center rounded-[10px] bg-doztra-primary text-[17px] font-extrabold text-white">
            D
          </div>
          <span className="text-[17px] font-extrabold tracking-[-0.01em]">Doztra</span>
        </div>
        {section && (
          <>
            <nav aria-label="Navigation principale" className="hidden gap-1.5 min-[960px]:flex">
              <Tab href="/demandes" active={section === "demandes"}>
                Demandes
              </Tab>
              <Suspense>
                <AdminTab active={section === "utilisateurs"} />
              </Suspense>
            </nav>
            <div className="flex items-center gap-2.5">
              <Suspense fallback={<div aria-hidden="true" className={AVATAR} />}>
                <CurrentUser />
              </Suspense>
            </div>
          </>
        )}
      </div>
      {children}
    </header>
  );
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="m-0 text-[clamp(28px,5.4vw,40px)] leading-[1.05] font-extrabold tracking-[-0.025em]">
      {children}
    </h1>
  );
}
