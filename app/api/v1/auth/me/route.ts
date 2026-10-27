import { requireApiUser } from "@/lib/api/auth";
import { ok, withApi } from "@/lib/api/http";

export const GET = withApi("GET /auth/me", async (req, ctx) => {
  const user = await requireApiUser(req, ctx);
  return ok({ id: user.id, name: user.name, email: user.email, role: user.role });
});
