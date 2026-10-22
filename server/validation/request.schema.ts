import { z } from "zod";

// Partagé entre l’aide à la saisie (client) et le contrôle serveur (RG6).

export type RequestFormValues = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  description: string;
};

export type RequestField = keyof RequestFormValues;
export type FieldErrors = Partial<Record<RequestField, string>>;

export const REQUEST_FIELDS: RequestField[] = [
  "customerName",
  "customerEmail",
  "customerPhone",
  "subject",
  "description",
];

export const DESCRIPTION_MAX = 5000;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Chaque règle reçoit la valeur après trim() (RG1).
const rules: Record<RequestField, (v: string) => string | undefined> = {
  customerName: (v) => {
    if (!v) return "Indiquez le nom du client ou de l’entreprise.";
    if (v.length < 2) return "Le nom doit contenir au moins 2 caractères.";
    if (v.length > 150) return `150 caractères maximum (actuellement ${v.length}).`;
  },
  customerEmail: (v) => {
    if (!v) return;
    if (v.length > 254) return "254 caractères maximum.";
    if (!EMAIL.test(v)) return "Adresse e-mail invalide. Exemple : nom@entreprise.com";
  },
  customerPhone: (v) => {
    if (v.length > 30) return `30 caractères maximum (actuellement ${v.length}).`;
  },
  subject: (v) => {
    if (!v) return "Indiquez l’objet de la demande.";
    if (v.length < 3) return "L’objet doit contenir au moins 3 caractères.";
    if (v.length > 200) return `200 caractères maximum (actuellement ${v.length}).`;
  },
  description: (v) => {
    if (!v) return "Décrivez la demande du client.";
    if (v.length < 10) return "La description doit contenir au moins 10 caractères.";
    if (v.length > DESCRIPTION_MAX)
      return `5 000 caractères maximum (actuellement ${v.length.toLocaleString("fr-FR")}).`;
  },
};

export function validateField(field: RequestField, raw: string): string | undefined {
  return rules[field]((raw ?? "").trim());
}

export function validateForm(values: RequestFormValues): FieldErrors {
  const errors: FieldErrors = {};
  for (const f of REQUEST_FIELDS) {
    const m = validateField(f, values[f]);
    if (m) errors[f] = m;
  }
  return errors;
}

const checked = (field: RequestField) =>
  z
    .string()
    .transform((v) => v.trim())
    .superRefine((v, ctx) => {
      const m = rules[field](v);
      if (m) ctx.addIssue({ code: "custom", message: m });
    });

// Coordonnée facultative : vide → null (RG2), téléphone conservé tel quel (RG3).
const optional = (field: RequestField) =>
  checked(field).transform((v) => (v === "" ? null : v));

export const createRequestSchema = z.object({
  submissionId: z.uuid(),
  customerName: checked("customerName"),
  customerEmail: optional("customerEmail"),
  customerPhone: optional("customerPhone"),
  subject: checked("subject"),
  description: checked("description"),
});

export type CreateRequestInput = z.input<typeof createRequestSchema>;

export const setPrioritySchema = z.object({
  id: z.uuid(),
  isPriority: z.boolean(), // RG18 — booléen strict
});

export const pageSchema = z.coerce.number().int().positive().catch(1); // RG14
