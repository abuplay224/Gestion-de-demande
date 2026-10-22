"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { type ActionResult, logServerError, unauthorized } from "@/lib/errors";
import { setPrioritySchema } from "@/server/validation/request.schema";

type PriorityResult = { id: string; isPriority: boolean; updatedAt: Date };

export async function setRequestPriority(input: unknown): Promise<ActionResult<PriorityResult>> {
  try {
    await requireUser(); // R15 : vérifié dans l’action elle-même
  } catch (e) {
    return unauthorized(e);
  }

  const parsed = setPrioritySchema.safeParse(input); // RG18 : booléen strict
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Demande invalide." };
  }
  const { id, isPriority } = parsed.data;

  try {
    // RG19 : n’écrit (et ne change updated_at) que si la valeur change réellement
    await prisma.customerRequest.updateMany({
      where: { id, isPriority: { not: isPriority } },
      data: { isPriority, updatedAt: new Date() },
    });

    const row = await prisma.customerRequest.findUnique({
      where: { id },
      select: { id: true, isPriority: true, updatedAt: true },
    });
    if (!row) return { ok: false, code: "NOT_FOUND", message: "Demande introuvable." };

    revalidatePath("/demandes");
    return { ok: true, data: row };
  } catch (e) {
    logServerError("setRequestPriority", e);
    return {
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Impossible de modifier la priorité. L’état précédent est conservé.",
    };
  }
}
