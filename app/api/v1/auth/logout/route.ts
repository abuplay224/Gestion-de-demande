import { bearerToken } from "@/lib/api/auth";
import { ApiError, noContent, readJson, withApi } from "@/lib/api/http";
import { revokeByRefreshToken, revokeSession, verifyAccessToken } from "@/lib/api/tokens";
import { logoutSchema } from "@/server/validation/api.schema";

/**
 * Révoque la session de l’appareil. Accepte le jeton d’accès (en-tête Bearer) ou, s’il a
 * expiré, le jeton de rafraîchissement dans le corps. Idempotent : 204 même si déjà révoquée.
 */
export const POST = withApi("POST /auth/logout", async (req, ctx) => {
  const token = bearerToken(req);
  if (token) {
    const check = await verifyAccessToken(token);
    if (check.status === "ok") {
      ctx.userId = check.user.id;
      await revokeSession(check.sessionId);
      return noContent();
    }
  }

  const parsed = logoutSchema.safeParse(await readJson(req, { optional: true }));
  if (parsed.success && parsed.data.refreshToken) {
    await revokeByRefreshToken(parsed.data.refreshToken);
    return noContent();
  }
  if (token) return noContent(); // jeton d’accès déjà expiré ou révoqué : rien à faire
  throw new ApiError(401, "UNAUTHORIZED", "Authentification requise.");
});
