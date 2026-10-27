import { disabledError } from "@/lib/api/auth";
import { ApiError, ok, readJson, withApi } from "@/lib/api/http";
import { clientIp, LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { tokensJson } from "@/lib/api/serialize";
import { rotateRefreshToken } from "@/lib/api/tokens";
import { fieldErrors, refreshSchema } from "@/server/validation/api.schema";

// Échange un jeton de rafraîchissement contre une nouvelle paire (l’ancien devient inutilisable).
export const POST = withApi("POST /auth/refresh", async (req, ctx) => {
  rateLimit(`refresh-ip:${clientIp(req)}`, LIMITS.refreshPerIp.limit, LIMITS.refreshPerIp.windowMs);

  const parsed = refreshSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION_ERROR", "Vérifiez les champs signalés.", fieldErrors(parsed.error));
  }

  const res = await rotateRefreshToken(parsed.data.refreshToken);
  if (res.status === "invalid") throw new ApiError(401, "UNAUTHORIZED", "Session expirée. Reconnectez-vous.");
  if (res.status === "disabled") throw disabledError();

  ctx.userId = res.user.id;
  return ok({ ...tokensJson(res.tokens), user: res.user });
});
