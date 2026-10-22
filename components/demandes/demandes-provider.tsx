"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Toast, type ToastState } from "./toast";

type DemandesContext = {
  /** Demande tout juste créée, surlignée brièvement dans la liste. */
  freshId: string | null;
  markFresh: (id: string) => void;
  notify: (text: string, kind?: "ok" | "err") => void;
};

const Ctx = createContext<DemandesContext | null>(null);

export function useDemandes() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDemandes doit être utilisé dans DemandesProvider");
  return ctx;
}

export function DemandesProvider({ children }: { children: React.ReactNode }) {
  const [freshId, setFreshId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const freshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(freshTimer.current);
      clearTimeout(toastTimer.current);
    },
    []
  );

  const markFresh = useCallback((id: string) => {
    clearTimeout(freshTimer.current);
    setFreshId(id);
    freshTimer.current = setTimeout(() => setFreshId(null), 2600);
  }, []);

  const notify = useCallback((text: string, kind: "ok" | "err" = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ text, kind, key: Date.now() });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  return (
    <Ctx.Provider value={{ freshId, markFresh, notify }}>
      {children}
      <div role="status" aria-live="polite">
        {toast && <Toast key={toast.key} text={toast.text} kind={toast.kind} />}
      </div>
    </Ctx.Provider>
  );
}
