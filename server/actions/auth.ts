"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logServerError } from "@/lib/errors";

export type SignInState = { error?: string; email?: string };

/** Destination après connexion : chemin interne uniquement (pas de redirection ouverte). */
function safeNext(raw: FormDataEntryValue | null) {
  const next = typeof raw === "string" ? raw : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/connexion") ? next : "/demandes";
}

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { error: "Indiquez votre e-mail et votre mot de passe.", email };
  }

  try {
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch (e) {
    if (e instanceof APIError) {
      if (e.body?.code === "BANNED_USER") {
        return { error: "Ce compte est désactivé. Contactez un administrateur.", email };
      }
      // Message identique que l’e-mail existe ou non (pas d’énumération de comptes)
      return { error: "E-mail ou mot de passe incorrect.", email };
    }
    logServerError("signIn", e);
    return { error: "Connexion impossible pour le moment. Réessayez dans un instant.", email };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signOut() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch (e) {
    logServerError("signOut", e);
  }
  redirect("/connexion");
}
