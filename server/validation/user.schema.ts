import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN, ROLES } from "@/lib/roles";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type UserFormValues = { name: string; email: string; role: string; password: string };
export type UserField = keyof UserFormValues;

const rules: Record<UserField, (v: string) => string | undefined> = {
  name: (v) => {
    const t = v.trim();
    if (!t) return "Indiquez le nom de la personne.";
    if (t.length < 2) return "Le nom doit contenir au moins 2 caractères.";
    if (t.length > 100) return `100 caractères maximum (actuellement ${t.length}).`;
  },
  email: (v) => {
    const t = v.trim();
    if (!t) return "Indiquez l’adresse e-mail.";
    if (t.length > 254) return "254 caractères maximum.";
    if (!EMAIL.test(t)) return "Adresse e-mail invalide. Exemple : nom@doztra.com";
  },
  role: (v) => {
    if (!(ROLES as readonly string[]).includes(v)) return "Choisissez un rôle.";
  },
  // Pas de trim : les espaces font partie du mot de passe.
  password: (v) => {
    if (v.length < PASSWORD_MIN) return `${PASSWORD_MIN} caractères minimum.`;
    if (v.length > PASSWORD_MAX) return `${PASSWORD_MAX} caractères maximum.`;
  },
};

export const USER_FIELDS: UserField[] = ["name", "email", "role", "password"];

export function validateUserField(field: UserField, value: string) {
  return rules[field](value ?? "");
}

export function validateUserForm(values: UserFormValues) {
  const errors: Partial<Record<UserField, string>> = {};
  for (const f of USER_FIELDS) {
    const m = validateUserField(f, values[f]);
    if (m) errors[f] = m;
  }
  return errors;
}

const checked = (field: UserField) =>
  z.string().superRefine((v, ctx) => {
    const m = rules[field](v);
    if (m) ctx.addIssue({ code: "custom", message: m });
  });

export const createUserSchema = z.object({
  name: checked("name").transform((v) => v.trim()),
  email: checked("email").transform((v) => v.trim().toLowerCase()),
  role: z.enum(ROLES, { error: "Choisissez un rôle." }),
  password: checked("password"),
});

export const setRoleSchema = z.object({ userId: z.string().min(1), role: z.enum(ROLES) });
export const setActiveSchema = z.object({ userId: z.string().min(1), active: z.boolean() });
