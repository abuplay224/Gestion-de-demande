import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import type { Role } from "./roles";
import { AuthError } from "./errors";

export type SessionUser = { id: string; name: string; email: string; role: Role };

/** Utilisateur de la session courante, ou null (pas de session, session expirée, compte désactivé). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.banned) return null;
  const { id, name, email, role } = session.user;
  return { id, name, email, role: role === "admin" ? "admin" : "agent" };
}

/**
 * Point de vérification unique pour toute lecture et toute écriture (R15).
 * Une Server Action est un point d’entrée public : elle doit l’appeler elle-même.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Accès réservé aux collaborateurs autorisés. Reconnectez-vous.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AuthError("Action réservée aux administrateurs.");
  return user;
}

/** Variante pour les pages : redirige au lieu de lever une erreur. */
export async function requirePageUser({ admin = false } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  if (admin && user.role !== "admin") redirect("/demandes");
  return user;
}
