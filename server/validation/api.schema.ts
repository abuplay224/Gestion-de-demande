import { z } from "zod";
import { PASSWORD_MAX } from "@/lib/roles";

// Corps des routes d’authentification de l’API mobile.

export const loginSchema = z.object({
  email: z
    .string({ error: "Indiquez votre e-mail." })
    .trim()
    .toLowerCase()
    .min(1, "Indiquez votre e-mail.")
    .max(254, "254 caractères maximum."),
  password: z
    .string({ error: "Indiquez votre mot de passe." })
    .min(1, "Indiquez votre mot de passe.")
    .max(PASSWORD_MAX, `${PASSWORD_MAX} caractères maximum.`),
  // Nom de l’appareil affiché dans les sessions (ex. « iPhone de Binta »), facultatif
  deviceName: z.string().trim().max(100, "100 caractères maximum.").optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string({ error: "Jeton de rafraîchissement manquant." }).min(1, "Jeton de rafraîchissement manquant.").max(200),
});

export const logoutSchema = z.object({ refreshToken: z.string().min(1).max(200).optional() });

/** Messages Zod par champ, au format de l’enveloppe d’erreur. */
export function fieldErrors(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !fields[key]) fields[key] = issue.message;
  }
  return fields;
}
