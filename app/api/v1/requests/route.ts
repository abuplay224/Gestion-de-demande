import { revalidatePath } from "next/cache";
import { requireApiUser } from "@/lib/api/auth";
import { fromResult, ok, readJson, withApi } from "@/lib/api/http";
import { requestJson } from "@/lib/api/serialize";
import { createRequestRecord, getRequestPage } from "@/server/services/requests";
import { pageSchema } from "@/server/validation/request.schema";

// Liste paginée : tri RG12 et pagination RG13 en base ; page hors bornes → dernière page
// valide (RG14), indiquée dans `page` (pas de redirection).
export const GET = withApi("GET /requests", async (req, ctx) => {
  await requireApiUser(req, ctx);
  const page = pageSchema.parse(new URL(req.url).searchParams.get("page") ?? undefined);
  const data = await getRequestPage(page);
  return ok({ ...data, items: data.items.map(requestJson) });
});

// Création idempotente par submissionId (RG7) : 201 créée, 200 déjà enregistrée à l’identique.
export const POST = withApi("POST /requests", async (req, ctx) => {
  await requireApiUser(req, ctx);
  const res = await createRequestRecord(await readJson(req));
  if (res.ok && res.data.created) revalidatePath("/demandes"); // le web voit la création
  return fromResult(res, ({ request }) => requestJson(request), res.ok && res.data.created ? 201 : 200);
});
