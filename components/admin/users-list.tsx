"use client";

import { useState } from "react";
import { cn } from "cn";
import { useDemandes } from "@/components/demandes/demandes-provider";
import { initials } from "@/components/demandes/request-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fDate } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";
import { setUserActive, setUserRole } from "@/server/actions/users";
import type { UserRow } from "@/server/queries/list-users";

const ACTION = "min-h-[38px] rounded-[11px] px-3 py-2 text-[12.5px]";

export function UsersList({ users, meId }: { users: UserRow[]; meId: string }) {
  const { notify } = useDemandes();
  const [pending, setPending] = useState<string | null>(null);

  async function run(userId: string, op: () => ReturnType<typeof setUserRole>, success: string) {
    if (pending) return;
    setPending(userId);
    try {
      const res = await op();
      if (res.ok) notify(success);
      else notify(res.message, "err");
    } catch {
      notify("Connexion au serveur impossible. Réessayez.", "err");
    } finally {
      setPending(null);
    }
  }

  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {users.map((u) => {
        const me = u.id === meId;
        const busy = pending === u.id;
        const nextRole = u.role === "admin" ? "agent" : "admin";
        return (
          <li
            key={u.id}
            aria-label={u.name}
            className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-doztra-line py-3.5 last:border-0"
          >
            <div className="flex min-w-[220px] flex-1 items-center gap-[11px]">
              <div
                aria-hidden="true"
                className="grid size-[34px] flex-none place-items-center rounded-full bg-doztra-av1-bg text-xs font-extrabold text-doztra-av1-fg"
              >
                {initials(u.name)}
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-bold">
                  {u.name} {me && <span className="font-medium text-doztra-muted">(vous)</span>}
                </span>
                <span className="truncate text-[12.5px] text-doztra-muted">{u.email}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className={cn(
                  "h-auto rounded-full px-[11px] py-[5px] text-[12.5px] font-bold",
                  u.role === "admin" ? "bg-doztra-primary-soft text-doztra-accent" : "bg-doztra-normal-bg text-doztra-muted-2"
                )}
              >
                {ROLE_LABELS[u.role]}
              </Badge>
              <Badge
                className={cn(
                  "h-auto rounded-full px-[11px] py-[5px] text-[12.5px] font-bold",
                  u.active ? "bg-doztra-av3-bg text-doztra-av3-fg" : "bg-doztra-prio-bg text-doztra-prio-fg"
                )}
              >
                {u.active ? "Actif" : "Désactivé"}
              </Badge>
              <span className="text-[12.5px] text-doztra-muted">Créé le {fDate.format(u.createdAt)}</span>
            </div>
            {!me && (
              <div className={cn("flex gap-2", busy && "opacity-55")}>
                <Button
                  type="button"
                  variant="outline"
                  size="none"
                  disabled={busy}
                  aria-busy={busy}
                  className={ACTION}
                  onClick={() =>
                    run(
                      u.id,
                      () => setUserRole({ userId: u.id, role: nextRole }),
                      `${u.name} est maintenant ${ROLE_LABELS[nextRole].toLowerCase()}`
                    )
                  }
                >
                  {u.role === "admin" ? "Passer agent" : "Passer administrateur"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="none"
                  disabled={busy}
                  aria-busy={busy}
                  className={cn(ACTION, u.active && "hover:border-doztra-error-field hover:text-doztra-error")}
                  onClick={() =>
                    run(
                      u.id,
                      () => setUserActive({ userId: u.id, active: !u.active }),
                      u.active ? `Compte de ${u.name} désactivé` : `Compte de ${u.name} réactivé`
                    )
                  }
                >
                  {u.active ? "Désactiver" : "Réactiver"}
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
