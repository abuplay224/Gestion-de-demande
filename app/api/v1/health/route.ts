import { connection } from "next/server";
import { API_VERSION, ok, withApi } from "@/lib/api/http";

// Public : état du service uniquement, aucune information d’infrastructure.
export const GET = withApi(
  "GET /health",
  async () => {
    await connection();
    return ok({ status: "ok", version: API_VERSION });
  },
  { versionCheck: false }
);
