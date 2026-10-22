"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { type ActionResult, logServerError, unauthorized } from "@/lib/errors";
import { requireAdmin, type SessionUser } from "@/lib/session";
import { createUserSchema, setActiveSchema, setRoleSchema } from "@/server/validation/user.schema";

const PAGE = "/admin/utilisateurs";
const GENERIC = "L’opération n’a pas pu aboutir. Réessayez dans un instant.";

async function adminOrFail(): Promise<SessionUser | ActionResult<never>> {
  try {
    return await requireAdmin(); // R15 : contrôle dans l’action elle-même
  } catch (e) {
    return unauthorized(e);
  }
}

const isResult = (v: SessionUser | ActionResult<never>): v is ActionResult<never> => "ok" in v;

export async function createUser(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await adminOrFail();
  if (isResult(me)) return me;

  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !fields[key]) fields[key] = issue.message;
    }
    return { ok: false, code: "VALIDATION_ERROR", message: "Vérifiez les champs signalés.", fields };
  }

  try {
    const { user } = await auth.api.createUser({ body: parsed.data, headers: await headers() });
    revalidatePath(PAGE);
    return { ok: true, data: { id: user.id } };
  } catch (e) {
    if (e instanceof APIError && String(e.body?.code ?? "").startsWith("USER_ALREADY_EXISTS")) {
      const message = "Un compte existe déjà avec cet e-mail.";
      return { ok: false, code: "CONFLICT", message, fields: { email: message } };
    }
    logServerError("createUser", e);
    return { ok: false, code: "INTERNAL_ERROR", message: GENERIC };
  }
}

export async function setUserRole(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await adminOrFail();
  if (isResult(me)) return me;

  const parsed = setRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR", message: "Demande invalide." };
  const { userId, role } = parsed.data;
  // Un administrateur ne peut pas se retirer ses propres droits : il reste toujours au moins un admin.
  if (userId === me.id) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Vous ne pouvez pas modifier votre propre rôle." };
  }

  try {
    await auth.api.setRole({ body: { userId, role }, headers: await headers() });
    revalidatePath(PAGE);
    return { ok: true, data: { id: userId } };
  } catch (e) {
    logServerError("setUserRole", e);
    return { ok: false, code: "INTERNAL_ERROR", message: GENERIC };
  }
}

/** Désactive (sessions révoquées, connexion refusée) ou réactive un compte. */
export async function setUserActive(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await adminOrFail();
  if (isResult(me)) return me;

  const parsed = setActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION_ERROR", message: "Demande invalide." };
  const { userId, active } = parsed.data;
  if (userId === me.id) {
    return { ok: false, code: "VALIDATION_ERROR", message: "Vous ne pouvez pas désactiver votre propre compte." };
  }

  try {
    const h = await headers();
    if (active) await auth.api.unbanUser({ body: { userId }, headers: h });
    else await auth.api.banUser({ body: { userId, banReason: "Désactivé par un administrateur" }, headers: h });
    revalidatePath(PAGE);
    return { ok: true, data: { id: userId } };
  } catch (e) {
    logServerError("setUserActive", e);
    return { ok: false, code: "INTERNAL_ERROR", message: GENERIC };
  }
}
