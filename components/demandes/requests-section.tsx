import { redirect, unstable_rethrow } from "next/navigation";
import { logServerError } from "@/lib/errors";
import { requirePageUser } from "@/lib/session";
import type { RequestPage } from "@/lib/types";
import { listRequests } from "@/server/queries/list-requests";
import { pageSchema } from "@/server/validation/request.schema";
import { ListPagination } from "./list-pagination";
import { EmptyState, ListError } from "./list-states";
import { RequestsList } from "./requests-list";

/** Contenu du registre : un seul des états vide / erreur / données (le chargement est le fallback Suspense). */
export async function RequestsSection({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  await requirePageUser(); // session expirée ou compte désactivé → /connexion
  const { page: raw } = await searchParams;
  const requested = pageSchema.parse(Array.isArray(raw) ? raw[0] : raw);

  let data: RequestPage;
  try {
    data = await listRequests(requested);
  } catch (e) {
    unstable_rethrow(e);
    logServerError("listRequests", e);
    return <ListError />;
  }

  // Page hors bornes → dernière page valide (RG14)
  if (raw !== undefined && data.page !== requested) {
    redirect(data.page === 1 ? "/demandes" : `/demandes?page=${data.page}`);
  }

  if (data.total === 0) return <EmptyState />;

  return (
    <>
      <RequestsList items={data.items} />
      <ListPagination page={data.page} pages={data.pages} total={data.total} pageSize={data.pageSize} />
    </>
  );
}
