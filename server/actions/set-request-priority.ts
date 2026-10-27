"use server";

import { revalidatePath } from "next/cache";
import { type ActionResult, unauthorized } from "@/lib/errors";
import { requireUser } from "@/lib/session";
import { type PriorityResult, setRequestPriorityRecord } from "@/server/services/requests";

/** Adaptateur web : session → service métier → invalidation de la liste. */
export async function setRequestPriority(input: unknown): Promise<ActionResult<PriorityResult>> {
  try {
    await requireUser(); // R15 : vérifié dans l’action elle-même
  } catch (e) {
    return unauthorized(e);
  }

  const res = await setRequestPriorityRecord(input);
  if (res.ok) revalidatePath("/demandes");
  return res;
}
