"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { type ActionResult, logServerError } from "@/lib/errors";
import { simulation, store, wait } from "@/server/data/fake-store";
import { createRequestSchema } from "@/server/validation/request.schema";

export async function createRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();

  const parsed = createRequestSchema.safeParse(input); // RG6
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return { ok: false, code: "VALIDATION_ERROR", message: "Vérifiez les champs signalés.", fields };
  }
  const d = parsed.data;

  try {
    await wait(600);
    if (simulation === "failure") throw new Error("Écriture simulée en échec");

    const rows = store();
    const existing = rows.find((r) => r.id === d.submissionId);
    if (existing) {
      // RG7 : même UUID → même contenu ou conflit
      const same =
        existing.customerName === d.customerName &&
        existing.subject === d.subject &&
        existing.description === d.description &&
        existing.customerEmail === d.customerEmail &&
        existing.customerPhone === d.customerPhone;
      if (same) return { ok: true, data: { id: existing.id } };
      return {
        ok: false,
        code: "CONFLICT",
        message:
          "Cette demande a déjà été enregistrée avec un contenu différent. Rechargez la liste avant de réessayer.",
      };
    }

    const now = new Date();
    rows.push({
      id: d.submissionId,
      customerName: d.customerName,
      customerEmail: d.customerEmail,
      customerPhone: d.customerPhone,
      subject: d.subject,
      description: d.description,
      isPriority: false, // RG5
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath("/demandes");
    return { ok: true, data: { id: d.submissionId } };
  } catch (e) {
    logServerError("createRequest", e);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message:
        "La base de données est momentanément indisponible. Votre saisie est conservée : vous pouvez réessayer sans risque de doublon.",
    };
  }
}
