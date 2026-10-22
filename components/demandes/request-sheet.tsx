"use client";

import { useRef } from "react";
import { Sheet, SheetClose, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { formatFull } from "@/lib/format";
import type { CustomerRequest } from "@/lib/types";
import { CustomerAvatar } from "./customer-avatar";
import { PriorityBadge } from "./priority-badge";
import { PriorityButton } from "./priority-button";
import { mailtoHref, telHref } from "./request-view";

const CAPS = "text-xs font-extrabold tracking-[.08em] text-doztra-muted uppercase";

type Props = {
  request: CustomerRequest | null;
  pending: boolean;
  onToggle: (r: CustomerRequest) => void;
  onClose: () => void;
  /** Élément à refocaliser à la fermeture (bouton « Voir »). */
  returnFocus: () => HTMLElement | null;
};

function Contact({ label, value, href }: { label: string; value: string | null; href: (v: string) => string }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px] rounded-xl bg-white px-[13px] py-[11px]">
      <span className="text-[11.5px] font-semibold text-doztra-muted">{label}</span>
      {value ? (
        <a href={href(value)} className="text-sm font-bold wrap-anywhere">
          {value}
        </a>
      ) : (
        <span className="text-sm text-doztra-muted">Non renseigné</span>
      )}
    </div>
  );
}

export function RequestSheet({ request, pending, onToggle, onClose, returnFocus }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const r = request;
  return (
    <Sheet open={!!r} onOpenChange={(open) => !open && onClose()}>
      {r && (
        <SheetContent
          initialFocus={closeRef}
          finalFocus={() => {
            const el = returnFocus();
            return el?.isConnected ? el : true;
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-doztra-line px-5 py-[18px]">
            <PriorityBadge isPriority={r.isPriority} />
            <SheetClose
              ref={closeRef}
              aria-label="Fermer le détail"
              className="grid size-11 place-items-center rounded-xl border-[1.5px] border-doztra-control bg-white text-xl text-doztra-ink"
            >
              ×
            </SheetClose>
          </div>

          <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-[22px]">
            <div className="flex flex-col gap-1.5">
              <span className={CAPS}>Objet</span>
              <SheetTitle className="m-0 text-[22px] leading-tight font-extrabold tracking-[-0.015em] wrap-anywhere">
                {r.subject}
              </SheetTitle>
            </div>
            <div className="flex flex-col gap-2">
              <span className={CAPS}>Description</span>
              <p className="m-0 text-[15px] leading-relaxed whitespace-pre-wrap text-doztra-ink-2 wrap-anywhere">
                {r.description}
              </p>
            </div>
            <div className="flex flex-col gap-3.5 rounded-2xl bg-doztra-soft-2 p-4">
              <div className="flex min-w-0 items-center gap-[11px]">
                <CustomerAvatar id={r.id} name={r.customerName} className="size-10 text-[13px]" />
                <div className="flex min-w-0 flex-col gap-px">
                  <span className="text-xs font-semibold text-doztra-muted">Client</span>
                  <span className="text-[15px] font-extrabold wrap-anywhere">{r.customerName}</span>
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-2.5">
                <Contact label="E-mail" value={r.customerEmail} href={mailtoHref} />
                <Contact label="Téléphone" value={r.customerPhone} href={telHref} />
              </div>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-doztra-line px-[13px] py-[11px]">
                <dt className="text-[11.5px] font-semibold text-doztra-muted">Créée le</dt>
                <dd className="mt-[3px] mb-0 ml-0 text-sm font-bold">{formatFull(r.createdAt)}</dd>
              </div>
              <div className="rounded-xl border border-doztra-line px-[13px] py-[11px]">
                <dt className="text-[11.5px] font-semibold text-doztra-muted">Modifiée le</dt>
                <dd className="mt-[3px] mb-0 ml-0 text-sm font-bold">{formatFull(r.updatedAt)}</dd>
              </div>
              <div className="col-span-full rounded-xl border border-doztra-line px-[13px] py-[11px]">
                <dt className="text-[11.5px] font-semibold text-doztra-muted">Identifiant</dt>
                <dd className="mt-[3px] mb-0 ml-0 font-mono text-[13px] break-all text-doztra-ink-2">{r.id}</dd>
              </div>
            </dl>
            <p className="m-0 text-[12.5px] text-doztra-muted">
              Heures affichées dans le fuseau Africa/Conakry. Lecture seule.
            </p>
          </div>

          <div className="border-t border-doztra-line px-5 py-4">
            <PriorityButton layout="sheet" isPriority={r.isPriority} pending={pending} onToggle={() => onToggle(r)} />
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
