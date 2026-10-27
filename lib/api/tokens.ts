import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { Role } from "@/lib/roles";

// Jetons de l’app mobile : opaques, aléatoires, seul leur SHA-256 est stocké.
// Accès court (15 min) ; rafraîchissement à usage unique (rotation), 30 jours glissants.

export const ACCESS_TTL_MS = 15 * 60_000;
export const REFRESH_TTL_MS = 30 * 24 * 3600_000;

export type ApiUser = { id: string; name: string; email: string; role: Role };
export type TokenPair = {
  tokenType: "Bearer";
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = (prefix: string) => `${prefix}_${randomBytes(32).toString("base64url")}`;

function freshPair() {
  const now = Date.now();
  const accessToken = newToken("dza");
  const refreshToken = newToken("dzr");
  return {
    pair: {
      tokenType: "Bearer" as const,
      accessToken,
      accessTokenExpiresAt: new Date(now + ACCESS_TTL_MS),
      refreshToken,
      refreshTokenExpiresAt: new Date(now + REFRESH_TTL_MS),
    },
    hashes: { accessTokenHash: hash(accessToken), refreshTokenHash: hash(refreshToken) },
  };
}

export const toApiUser = (u: { id: string; name: string; email: string; role: string }): ApiUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role === "admin" ? "admin" : "agent",
});

/** Ouvre une session pour un appareil après vérification des identifiants. */
export async function issueSession(userId: string, deviceName: string | null): Promise<TokenPair> {
  const { pair, hashes } = freshPair();
  await prisma.apiSession.create({
    data: {
      id: randomUUID(),
      userId,
      ...hashes,
      accessExpiresAt: pair.accessTokenExpiresAt,
      refreshExpiresAt: pair.refreshTokenExpiresAt,
      deviceName,
    },
  });
  return pair;
}

export type AccessCheck =
  | { status: "ok"; sessionId: string; user: ApiUser }
  | { status: "invalid" } // absent, inconnu, expiré ou révoqué → 401
  | { status: "disabled" }; // compte désactivé → 403

export async function verifyAccessToken(token: string): Promise<AccessCheck> {
  const session = await prisma.apiSession.findUnique({
    where: { accessTokenHash: hash(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, banned: true } } },
  });
  if (!session || session.revokedAt || session.accessExpiresAt.getTime() <= Date.now()) {
    return { status: "invalid" };
  }
  if (session.user.banned) return { status: "disabled" };
  // Date de dernier usage, mise à jour au plus toutes les 5 minutes
  if (Date.now() - session.lastUsedAt.getTime() > 5 * 60_000) {
    await prisma.apiSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
  }
  return { status: "ok", sessionId: session.id, user: toApiUser(session.user) };
}

export type RefreshResult =
  | { status: "ok"; tokens: TokenPair; user: ApiUser }
  | { status: "invalid" }
  | { status: "disabled" };

/**
 * Rotation : le jeton présenté est consommé et remplacé. Présenter un jeton déjà consommé
 * révoque toute la session de l’appareil (jeton probablement volé).
 */
export async function rotateRefreshToken(refreshToken: string): Promise<RefreshResult> {
  const h = hash(refreshToken);
  const session = await prisma.apiSession.findUnique({
    where: { refreshTokenHash: h },
    include: { user: { select: { id: true, name: true, email: true, role: true, banned: true } } },
  });

  if (!session) {
    await prisma.apiSession.updateMany({
      where: { previousRefreshHash: h, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { status: "invalid" };
  }
  if (session.revokedAt || session.refreshExpiresAt.getTime() <= Date.now()) return { status: "invalid" };
  if (session.user.banned) {
    await revokeSession(session.id);
    return { status: "disabled" };
  }

  const { pair, hashes } = freshPair();
  // Écriture conditionnelle : deux rafraîchissements simultanés ne peuvent pas réussir tous les deux
  const { count } = await prisma.apiSession.updateMany({
    where: { id: session.id, refreshTokenHash: h, revokedAt: null },
    data: {
      ...hashes,
      previousRefreshHash: h,
      accessExpiresAt: pair.accessTokenExpiresAt,
      refreshExpiresAt: pair.refreshTokenExpiresAt,
      lastUsedAt: new Date(),
    },
  });
  if (count === 0) return { status: "invalid" };
  return { status: "ok", tokens: pair, user: toApiUser(session.user) };
}

export async function revokeSession(sessionId: string) {
  await prisma.apiSession.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
}

export async function revokeByRefreshToken(refreshToken: string) {
  await prisma.apiSession.updateMany({
    where: { refreshTokenHash: hash(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Déconnecte tous les appareils d’un utilisateur (compte désactivé). */
export async function revokeUserApiSessions(userId: string) {
  await prisma.apiSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
