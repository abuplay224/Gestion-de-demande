"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { type ActionResult, logServerError } from "@/lib/errors";
import { simulation, store, wait } from "@/server/data/fake-store";
import { setPrioritySchema } from "@/server/validation/request.schema";

type PriorityResult = { id: string; isPriority: boolean; updatedAt: Date };

export async function setRequestPriority(input: unknown): Promise<ActionResult<PriorityResult>> {
  await requireUser();

  const parsed = setPrioritySchema.safeParse(input); // RG18 : booléen strict
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Demande invalide." };
  }
  const { id, isPriority } = parsed.data;

  try {
    await wait(450);
    if (simulation === "failure") throw new Error("Écriture simulée en échec");

    const row = store().find((r) => r.id === id);
    if (!row) return { ok: false, code: "NOT_FOUND", message: "Demande introuvable." };

    if (row.isPriority !== isPriority) {
      // RG19 : updated_at seulement sur changement réel
      row.isPriority = isPriority;
      row.updatedAt = new Date();
    }

    revalidatePath("/demandes");
    return { ok: true, data: { id: row.id, isPriority: row.isPriority, updatedAt: row.updatedAt } };
  } catch (e) {
    logServerError("setRequestPriority", e);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Impossible de modifier la priorité. L’état précédent est conservé.",
    };
  }
}
