"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, unauthorized } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { createRequestRecord } from "@/server/services/requests";

/** Adaptateur web : session → service métier → invalidation de la liste. */
export async function createRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser(); // R15 : vérifié dans l’action elle-même
  } catch (e) {
    return unauthorized(e);
  }

  const res = await createRequestRecord(input);
  if (!res.ok) return res;
  if (res.data.created) revalidatePath("/demandes");
  return { ok: true, data: { id: res.data.request.id } };
}
