import "server-only";
import { connection } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { RequestPage } from "@/lib/types";

export const PAGE_SIZE = 20;

export async function listRequests(page: number): Promise<RequestPage> {
  await connection();
  await requireUser();

  const total = await prisma.customerRequest.count();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages); // RG14

  const items = await prisma.customerRequest.findMany({
    // ORDER BY is_priority DESC, created_at DESC, id DESC (RG12), tri avant découpage (RG13)
    orderBy: [{ isPriority: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return { items, total, page: current, pageSize: PAGE_SIZE, pages };
}

export async function countRequests() {
  await connection();
  await requireUser();

  const [total, priority] = await Promise.all([
    prisma.customerRequest.count(),
    prisma.customerRequest.count({ where: { isPriority: true } }),
  ]);
  return { total, priority };
}
