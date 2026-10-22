"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type CustomerRequest } from "@/generated/prisma/client";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { type ActionResult, logServerError, unauthorized } from "@/lib/errors";
import { createRequestSchema } from "@/server/validation/request.schema";

type Parsed = ReturnType<typeof createRequestSchema.parse>;

// RG7 : même UUID → même contenu (succès sans création) ou conflit (aucun écrasement)
function resolveExisting(existing: CustomerRequest, d: Parsed): ActionResult<{ id: string }> {
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

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser(); // R15 : vérifié dans l’action elle-même
  } catch (e) {
    return unauthorized(e);
  }

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
    const existing = await prisma.customerRequest.findUnique({ where: { id: d.submissionId } });
    if (existing) return resolveExisting(existing, d);

    const now = new Date();
    try {
      await prisma.customerRequest.create({
        // Une seule écriture atomique ; id, dates et priorité fixés par le serveur (RG5)
        data: {
          id: d.submissionId,
          customerName: d.customerName,
          customerEmail: d.customerEmail, // RG2 : null si vide
          customerPhone: d.customerPhone, // RG3 : tel quel
          subject: d.subject,
          description: d.description,
          isPriority: false,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (e) {
      // Deux envois simultanés du même UUID : l’autre a gagné, on applique RG7
      if (!isUniqueViolation(e)) throw e;
      const winner = await prisma.customerRequest.findUnique({ where: { id: d.submissionId } });
      if (!winner) throw e;
      return resolveExisting(winner, d);
    }

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
