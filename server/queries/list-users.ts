import "server-only";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/roles";
import { requireAdmin } from "@/lib/session";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: Date;
};

/** Comptes de l’équipe, actifs d’abord puis par nom (administrateurs uniquement). */
export async function listUsers(): Promise<UserRow[]> {
  await requireAdmin();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, banned: true, createdAt: true },
    orderBy: [{ banned: "asc" }, { name: "asc" }],
  });
  return users.map(({ banned, role, ...u }) => ({
    ...u,
    role: role === "admin" ? "admin" : "agent",
    active: !banned,
  }));
}
