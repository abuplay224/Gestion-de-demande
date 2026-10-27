import "server-only";
import { connection } from "next/server";
import { requireUser } from "@/lib/session";
import type { RequestPage } from "@/lib/types";
import { countRequestsByPriority, getRequestPage } from "@/server/services/requests";

export { PAGE_SIZE } from "@/server/services/requests";

/** Adaptateur web (Server Components) : session vérifiée puis service métier. */
export async function listRequests(page: number): Promise<RequestPage> {
  await connection();
  await requireUser();
  return getRequestPage(page);
}

export async function countRequests() {
  await connection();
  await requireUser();
  return countRequestsByPriority();
}
