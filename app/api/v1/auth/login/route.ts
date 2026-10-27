import { disabledError, verifyCredentials } from "@/lib/api/auth";
import { ApiError, ok, readJson, withApi } from "@/lib/api/http";
import { clientIp, LIMITS, rateLimit } from "@/lib/api/rate-limit";
import { tokensJson } from "@/lib/api/serialize";
import { issueSession } from "@/lib/api/tokens";
import { fieldErrors, loginSchema } from "@/server/validation/api.schema";

export const POST = withApi("POST /auth/login", async (req, ctx) => {
  const ip = clientIp(req);
  rateLimit(`login-ip:${ip}`, LIMITS.loginPerIp.limit, LIMITS.loginPerIp.windowMs);

  const parsed = loginSchema.safeParse(await readJson(req));
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION_ERROR", "Vérifiez les champs signalés.", fieldErrors(parsed.error));
  }
  const { email, password, deviceName } = parsed.data;
  rateLimit(`login:${ip}:${email}`, LIMITS.loginPerAccount.limit, LIMITS.loginPerAccount.windowMs);

  const user = await verifyCredentials(email, password);
  // Même message que l’e-mail existe ou non (pas d’énumération de comptes)
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "E-mail ou mot de passe incorrect.");
  if (user.banned) throw disabledError();

  ctx.userId = user.id;
  const tokens = await issueSession(user.id, deviceName || null);
  return ok({ ...tokensJson(tokens), user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});
