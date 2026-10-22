export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: AppErrorCode;
      message: string;
      fields?: Record<string, string>;
    };

export function logServerError(scope: string, e: unknown) {
  // Jamais de description ni de coordonnées dans le journal
  console.error(`[${scope}]`, e instanceof Error ? e.message : "erreur inconnue");
}
