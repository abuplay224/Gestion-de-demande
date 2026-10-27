import type { CustomerRequest } from "@/lib/types";
import type { TokenPair } from "./tokens";

// Formes JSON publiques de l’API v1 : champs explicites (évolutions additives uniquement),
// dates en ISO 8601 UTC.

export const requestJson = (r: CustomerRequest) => ({
  id: r.id,
  customerName: r.customerName,
  customerEmail: r.customerEmail,
  customerPhone: r.customerPhone,
  subject: r.subject,
  description: r.description,
  isPriority: r.isPriority,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export const tokensJson = (t: TokenPair) => ({
  tokenType: t.tokenType,
  accessToken: t.accessToken,
  accessTokenExpiresAt: t.accessTokenExpiresAt.toISOString(),
  refreshToken: t.refreshToken,
  refreshTokenExpiresAt: t.refreshTokenExpiresAt.toISOString(),
});
