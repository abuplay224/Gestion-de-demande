import "server-only";
import { Prisma, type CustomerRequest } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { type ActionResult, logServerError } from "@/lib/errors";
import type { RequestPage } from "@/lib/types";
import { createRequestSchema, setPrioritySchema } from "@/server/validation/request.schema";
import { z } from "zod";

// Logique métier des demandes, unique source de vérité pour le web (Server Actions) et
// l’API mobile (Route Handlers). Pas de contrôle d’accès ici : chaque adaptateur vérifie
// l’utilisateur AVANT d’appeler ces fonctions. Pas de revalidatePath non plus.

export const PAGE_SIZE = 20;

/** Page de demandes, triée en base (RG12) puis découpée (RG13), page bornée (RG14). */
export async function getRequestPage(page: number): Promise<RequestPage> {
  const total = await prisma.customerRequest.count();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);

  const items = await prisma.customerRequest.findMany({
    orderBy: [{ isPriority: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return { items, total, page: current, pageSize: PAGE_SIZE, pages };
}

export async function countRequestsByPriority() {
  const [total, priority] = await Promise.all([
    prisma.customerRequest.count(),
    prisma.customerRequest.count({ where: { isPriority: true } }),
  ]);
  return { total, priority };
}

const idSchema = z.uuid();

/** Une demande par identifiant ; identifiant invalide → VALIDATION_ERROR, inconnu → NOT_FOUND. */
export async function getRequest(id: string): Promise<ActionResult<CustomerRequest>> {
  if (!idSchema.safeParse(id).success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Identifiant de demande invalide." };
  }
  const row = await prisma.customerRequest.findUnique({ where: { id } });
  if (!row) return { ok: false, code: "NOT_FOUND", message: "Demande introuvable." };
  return { ok: true, data: row };
}

type Parsed = z.output<typeof createRequestSchema>;
export type CreateResult = { request: CustomerRequest; created: boolean };

// RG7 : même UUID → même contenu (succès sans création) ou conflit (aucun écrasement)
function resolveExisting(existing: CustomerRequest, d: Parsed): ActionResult<CreateResult> {
  const same =
    existing.customerName === d.customerName &&
    existing.subject === d.subject &&
    existing.description === d.description &&
    existing.customerEmail === d.customerEmail &&
    existing.customerPhone === d.customerPhone;
  if (same) return { ok: true, data: { request: existing, created: false } };
  return {
    ok: false,
    code: "CONFLICT",
    message:
      "Cette demande a déjà été enregistrée avec un contenu différent. Rechargez la liste avant de réessayer.",
  };
}

const isUniqueViolation = (e: unknown) =>
  e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/** Création idempotente par UUID de soumission (RG5–RG7), une seule écriture atomique. */
export async function createRequestRecord(input: unknown): Promise<ActionResult<CreateResult>> {
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
      const request = await prisma.customerRequest.create({
        // id, dates et priorité fixés par le serveur (RG5)
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
      return { ok: true, data: { request, created: true } };
    } catch (e) {
      // Deux envois simultanés du même UUID : l’autre a gagné, on applique RG7
      if (!isUniqueViolation(e)) throw e;
      const winner = await prisma.customerRequest.findUnique({ where: { id: d.submissionId } });
      if (!winner) throw e;
      return resolveExisting(winner, d);
    }
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

export type PriorityResult = { id: string; isPriority: boolean; updatedAt: Date };

/** Priorité explicite (RG18), updated_at modifié seulement sur changement réel (RG19). */
export async function setRequestPriorityRecord(input: unknown): Promise<ActionResult<PriorityResult>> {
  const parsed = setPrioritySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Demande invalide." };
  }
  const { id, isPriority } = parsed.data;

  try {
    await prisma.customerRequest.updateMany({
      where: { id, isPriority: { not: isPriority } },
      data: { isPriority, updatedAt: new Date() },
    });

    const row = await prisma.customerRequest.findUnique({
      where: { id },
      select: { id: true, isPriority: true, updatedAt: true },
    });
    if (!row) return { ok: false, code: "NOT_FOUND", message: "Demande introuvable." };
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
