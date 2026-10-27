import "server-only";
import { auth } from "@/lib/auth";
import { ApiError, type ApiContext } from "./http";
import { LIMITS, rateLimit } from "./rate-limit";
import { type ApiUser, toApiUser, verifyAccessToken } from "./tokens";

const DISABLED = "Ce compte est désactivé. Contactez un administrateur.";

export function bearerToken(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

/**
 * À appeler en première ligne de chaque handler protégé (R15).
 * 401 : jeton absent, inconnu, expiré ou révoqué → l’app tente un rafraîchissement.
 * 403 : compte désactivé → l’app déconnecte.
 */
export async function requireApiUser(req: Request, ctx: ApiContext): Promise<ApiUser & { sessionId: string }> {
  const token = bearerToken(req);
  if (!token) throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
  const check = await verifyAccessToken(token);
  if (check.status === "invalid") throw new ApiError(401, "UNAUTHORIZED", "Session expirée. Reconnectez-vous.");
  if (check.status === "disabled") throw new ApiError(403, "UNAUTHORIZED", DISABLED);
  ctx.userId = check.user.id;
  rateLimit(`data:${check.user.id}`, LIMITS.dataPerUser.limit, LIMITS.dataPerUser.windowMs);
  return { ...check.user, sessionId: check.sessionId };
}

export const disabledError = () => new ApiError(403, "UNAUTHORIZED", DISABLED);

// Hachage factice : même temps de réponse que l’e-mail existe ou non (pas d’énumération).
let dummyHash: Promise<string> | null = null;

/** Vérifie e-mail + mot de passe sans créer de session web. */
export async function verifyCredentials(email: string, password: string): Promise<ApiUser & { banned: boolean } | null> {
  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });
  const stored = found?.accounts.find((a) => a.providerId === "credential")?.password;
  dummyHash ??= ctx.password.hash("mot-de-passe-factice-pour-egaliser");
  const valid = await ctx.password.verify({ hash: stored ?? (await dummyHash), password });
  if (!found || !stored || !valid) return null;
  const u = found.user as typeof found.user & { role?: string | null; banned?: boolean | null };
  return { ...toApiUser({ ...u, role: u.role ?? "agent" }), banned: Boolean(u.banned) };
}
