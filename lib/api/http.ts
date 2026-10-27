import "server-only";
import { unstable_rethrow } from "next/navigation";
import { type ActionResult, type AppErrorCode, logServerError } from "@/lib/errors";

// Socle HTTP de l’API mobile : enveloppes JSON, erreurs, corps plafonné, version de l’app.

export type ApiErrorCode = AppErrorCode | "RATE_LIMITED" | "PAYLOAD_TOO_LARGE" | "UPGRADE_REQUIRED";

export const API_VERSION = "1.0.0";
const MAX_BODY_BYTES = 64 * 1024;

const STATUS: Record<AppErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 503,
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
    readonly headers?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const BASE_HEADERS = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };

export function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), { status, headers: BASE_HEADERS });
}

export function noContent() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

function errorResponse(e: ApiError) {
  const body = { error: { code: e.code, message: e.message, ...(e.fields ? { fields: e.fields } : {}) } };
  return new Response(JSON.stringify(body), { status: e.status, headers: { ...BASE_HEADERS, ...e.headers } });
}

/** Convertit un résultat de service en réponse HTTP (ou lève l’erreur correspondante). */
export function fromResult<T>(res: ActionResult<T>, map: (data: T) => unknown, status = 200) {
  if (res.ok) return ok(map(res.data), status);
  throw new ApiError(STATUS[res.code], res.code, res.message, res.fields);
}

/** Lit un corps JSON objet, 64 Ko au plus (corps vide accepté si `optional`). */
export async function readJson(req: Request, { optional = false } = {}): Promise<Record<string, unknown>> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  const tooLarge = () => new ApiError(413, "PAYLOAD_TOO_LARGE", "La requête est trop volumineuse.");
  if (declared > MAX_BODY_BYTES) throw tooLarge();
  const text = await req.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) throw tooLarge();
  if (optional && !text.trim()) return {};
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === "object" && !Array.isArray(body)) return body as Record<string, unknown>;
  } catch {
    // traité ci-dessous
  }
  throw new ApiError(422, "VALIDATION_ERROR", "Le corps de la requête doit être un objet JSON valide.");
}

function olderThan(version: string, min: string) {
  const a = version.split(".").map(Number);
  const b = min.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) < (b[i] || 0);
  }
  return false;
}

/** 426 si MOBILE_MIN_APP_VERSION est définie et que l’app (X-App-Version) est plus ancienne. */
function checkAppVersion(req: Request) {
  const min = process.env.MOBILE_MIN_APP_VERSION;
  if (!min) return;
  const version = req.headers.get("x-app-version") ?? "0.0.0";
  if (!/^\d+(\.\d+){0,2}$/.test(version) || olderThan(version, min)) {
    throw new ApiError(426, "UPGRADE_REQUIRED", "Une mise à jour de l’application est nécessaire.", undefined, {
      "X-Min-App-Version": min,
    });
  }
}

export type ApiContext = { userId?: string };

/**
 * Enveloppe commune à chaque handler : version de l’app, erreurs contrôlées, journal sans
 * donnée personnelle (méthode, route, statut, utilisateur, durée). Aucune exception brute
 * n’est renvoyée au client.
 */
export function withApi(
  route: string,
  handler: (req: Request, ctx: ApiContext) => Promise<Response>,
  { versionCheck = true } = {}
) {
  return async (req: Request): Promise<Response> => {
    const started = Date.now();
    const ctx: ApiContext = {};
    let res: Response;
    try {
      if (versionCheck) checkAppVersion(req);
      res = await handler(req, ctx);
    } catch (e) {
      unstable_rethrow(e); // signaux internes de Next.js (pré-rendu interrompu…)
      if (e instanceof ApiError) res = errorResponse(e);
      else {
        logServerError(`api ${route}`, e);
        res = errorResponse(new ApiError(500, "INTERNAL_ERROR", "Une erreur inattendue est survenue. Réessayez."));
      }
    }
    if (process.env.NODE_ENV !== "test") {
      console.info(`[api] ${route} ${res.status} user=${ctx.userId ?? "-"} ${Date.now() - started}ms`);
    }
    return res;
  };
}
