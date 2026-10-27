import { revalidatePath } from "next/cache";
import { requireApiUser } from "@/lib/api/auth";
import { fromResult, readJson, withApi } from "@/lib/api/http";
import { setRequestPriorityRecord } from "@/server/services/requests";

// Corps { "isPriority": true|false } : valeur souhaitée explicite (RG18), jamais une inversion.
export async function PATCH(req: Request, { params }: RouteContext<"/api/v1/requests/[id]/priority">) {
  const { id } = await params;
  return withApi("PATCH /requests/{id}/priority", async (r, ctx) => {
    await requireApiUser(r, ctx);
    const body = await readJson(r);
    const res = await setRequestPriorityRecord({ id, isPriority: body.isPriority });
    if (res.ok) revalidatePath("/demandes");
    return fromResult(res, (d) => ({ id: d.id, isPriority: d.isPriority, updatedAt: d.updatedAt.toISOString() }));
  })(req);
}
