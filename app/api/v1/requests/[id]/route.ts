import { requireApiUser } from "@/lib/api/auth";
import { fromResult, withApi } from "@/lib/api/http";
import { requestJson } from "@/lib/api/serialize";
import { getRequest } from "@/server/services/requests";

export async function GET(req: Request, { params }: RouteContext<"/api/v1/requests/[id]">) {
  const { id } = await params;
  return withApi("GET /requests/{id}", async (r, ctx) => {
    await requireApiUser(r, ctx);
    return fromResult(await getRequest(id), requestJson);
  })(req);
}
