import "server-only";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import type { CustomerRequest, RequestPage } from "@/lib/types";
import { simulation, store, wait } from "@/server/data/fake-store";

export const PAGE_SIZE = 20;

// ORDER BY is_priority DESC, created_at DESC, id DESC (RG12)
function compare(a: CustomerRequest, b: CustomerRequest) {
  return (
    Number(b.isPriority) - Number(a.isPriority) ||
    b.createdAt.getTime() - a.createdAt.getTime() ||
    (b.id < a.id ? -1 : b.id > a.id ? 1 : 0)
  );
}

export async function listRequests(page: number): Promise<RequestPage> {
  await connection();
  await requireUser();
  if (simulation === "slow") await wait(1200);
  if (simulation === "error") throw new Error("Lecture simulée en échec");

  const all = [...store()].sort(compare); // tri avant découpage (RG13)
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages); // RG14

  return {
    items: all.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE),
    total,
    page: current,
    pageSize: PAGE_SIZE,
    pages,
  };
}

export async function countRequests() {
  await connection();
  await requireUser();
  if (simulation === "slow") await wait(1200);
  if (simulation === "error") throw new Error("Lecture simulée en échec");

  const all = store();
  return { total: all.length, priority: all.filter((r) => r.isPriority).length };
}
