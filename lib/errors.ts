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

/** Absence de session valide ou de droit suffisant (code UNAUTHORIZED). */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/** Convertit un refus d’accès en résultat d’action ; relance toute autre erreur. */
export function unauthorized(e: unknown): { ok: false; code: "UNAUTHORIZED"; message: string } {
  if (e instanceof AuthError) return { ok: false, code: "UNAUTHORIZED", message: e.message };
  throw e;
}

export function logServerError(scope: string, e: unknown) {
  // Jamais de description ni de coordonnées dans le journal
  console.error(`[${scope}]`, e instanceof Error ? e.message : "erreur inconnue");
}
