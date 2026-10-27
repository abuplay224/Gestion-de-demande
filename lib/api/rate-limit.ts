import "server-only";
import { ApiError } from "./http";

// Limiteur à fenêtre glissante, en mémoire. Limite connue : compteur propre à chaque
// instance du serveur (plusieurs instances serverless = plafond multiplié). Suffisant pour
// freiner le bourrage d’identifiants ; à remplacer par un stockage partagé si nécessaire.

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    hits.set(key, recent);
    throw new ApiError(429, "RATE_LIMITED", "Trop de tentatives. Réessayez dans quelques instants.", undefined, {
      "Retry-After": String(retryAfter),
    });
  }
  recent.push(now);
  hits.set(key, recent);
}

/** Adresse du client (derrière le proxy de l’hébergeur). */
export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

export const LIMITS = {
  loginPerAccount: { limit: 5, windowMs: 15 * 60_000 },
  loginPerIp: { limit: 20, windowMs: 15 * 60_000 },
  refreshPerIp: { limit: 30, windowMs: 60_000 },
  dataPerUser: { limit: 120, windowMs: 60_000 },
};

/** Réservé aux tests. */
export function resetRateLimits() {
  hits.clear();
}
