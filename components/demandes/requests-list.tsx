"use client";

import { useRef, useState } from "react";
import type { CustomerRequest } from "@/lib/types";
import { setRequestPriority } from "@/server/actions/set-request-priority";
import { useDemandes } from "./demandes-provider";
import { RequestSheet } from "./request-sheet";
import { RequestsCards } from "./requests-cards";
import { RequestsTable } from "./requests-table";

/** Liste interactive de la page courante : bascule de priorité et panneau de détail. */
export function RequestsList({ items }: { items: CustomerRequest[] }) {
  const { freshId, notify } = useDemandes();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const isPending = (id: string) => !!pending[id];
  const open = openId ? (items.find((i) => i.id === openId) ?? null) : null;

  async function toggle(r: CustomerRequest) {
    if (pending[r.id]) return;
    const target = !r.isPriority; // valeur souhaitée explicite (RG18)
    setPending((p) => ({ ...p, [r.id]: true }));
    try {
      const res = await setRequestPriority({ id: r.id, isPriority: target });
      if (res.ok) notify(res.data.isPriority ? "Demande marquée comme prioritaire" : "Priorité retirée");
      else notify(res.message, "err");
    } catch {
      notify("Impossible de modifier la priorité. L’état précédent est conservé.", "err");
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[r.id];
        return next;
      });
    }
  }

  function view(r: CustomerRequest, trigger: HTMLElement) {
    lastTrigger.current = trigger;
    setOpenId(r.id);
  }

  const actions = { freshId, isPending, onToggle: toggle, onView: view };

  return (
    <>
      <div className="hidden min-w-0 min-[960px]:block">
        <RequestsTable items={items} {...actions} />
      </div>
      <div className="min-[960px]:hidden">
        <RequestsCards items={items} {...actions} />
      </div>
      <RequestSheet
        request={open}
        pending={open ? isPending(open.id) : false}
        onToggle={toggle}
        onClose={() => setOpenId(null)}
        returnFocus={() => lastTrigger.current}
      />
    </>
  );
}
