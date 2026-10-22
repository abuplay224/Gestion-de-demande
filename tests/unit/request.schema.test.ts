import { describe, expect, it } from "vitest";
import {
  createRequestSchema,
  pageSchema,
  setPrioritySchema,
  validateField,
  validateForm,
} from "@/server/validation/request.schema";

const UUID = "3f2b8c1e-4d5a-4b6c-8e7f-9a0b1c2d3e4f";
const valid = {
  submissionId: UUID,
  customerName: "Hôtel Kaloum",
  customerEmail: "",
  customerPhone: "",
  subject: "Coupure du service",
  description: "Le système de réservation est inaccessible.",
};

const issues = (input: unknown) => {
  const r = createRequestSchema.safeParse(input);
  return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message]));
};

describe("champs obligatoires — R02", () => {
  it.each([
    ["customerName", "Indiquez le nom du client ou de l’entreprise."],
    ["subject", "Indiquez l’objet de la demande."],
    ["description", "Décrivez la demande du client."],
  ] as const)("%s vide ou composé d’espaces est refusé", (field, message) => {
    expect(issues({ ...valid, [field]: "" })[field]).toBe(message);
    expect(issues({ ...valid, [field]: "    " })[field]).toBe(message);
  });

  it.each([
    ["customerName", 2, 150],
    ["subject", 3, 200],
    ["description", 10, 5000],
  ] as const)("%s accepte exactement %i et %i caractères, refuse au-delà", (field, min, max) => {
    expect(validateField(field, "x".repeat(min))).toBeUndefined();
    expect(validateField(field, "x".repeat(max))).toBeUndefined();
    expect(validateField(field, "x".repeat(min - 1))).toMatch(/au moins/);
    expect(validateField(field, "x".repeat(max + 1))).toMatch(/maximum \(actuellement/);
  });

  it("les bornes portent sur la valeur après trim() (RG1)", () => {
    expect(validateField("customerName", "  A  ")).toBe("Le nom doit contenir au moins 2 caractères.");
    expect(validateField("customerName", `  ${"x".repeat(150)}  `)).toBeUndefined();
  });

  it("validateForm signale tous les champs fautifs d’un coup", () => {
    const errs = validateForm({ customerName: "", customerEmail: "x", customerPhone: "", subject: "", description: "" });
    expect(Object.keys(errs).sort()).toEqual(["customerEmail", "customerName", "description", "subject"]);
  });
});

describe("e-mail — R03", () => {
  it.each(["nom@entreprise", "nom.entreprise.com", "nom @x.com", "@x.com", "a@b.c"])("« %s » est refusé", (email) => {
    expect(validateField("customerEmail", email)).toBe("Adresse e-mail invalide. Exemple : nom@entreprise.com");
  });

  it("accepte une adresse valide et 254 caractères maximum", () => {
    expect(validateField("customerEmail", "dsi@orange-guinee.com")).toBeUndefined();
    const at254 = `${"a".repeat(240)}@exemple.com`.padStart(254, "b");
    expect(at254).toHaveLength(254);
    expect(validateField("customerEmail", at254)).toBeUndefined();
    expect(validateField("customerEmail", `b${at254}`)).toBe("254 caractères maximum.");
  });

  it("est facultatif", () => {
    expect(validateField("customerEmail", "")).toBeUndefined();
  });
});

describe("téléphone et normalisation — RG2, RG3, R04", () => {
  it("conserve le +, le zéro initial et les espaces internes", () => {
    const r = createRequestSchema.parse({ ...valid, customerPhone: "  +224 0622 45 78 90 " });
    expect(r.customerPhone).toBe("+224 0622 45 78 90");
  });

  it("refuse plus de 30 caractères", () => {
    expect(validateField("customerPhone", "1".repeat(30))).toBeUndefined();
    expect(validateField("customerPhone", "1".repeat(31))).toBe("30 caractères maximum (actuellement 31).");
  });

  it("enregistre les coordonnées vides ou faites d’espaces comme null", () => {
    const r = createRequestSchema.parse({ ...valid, customerEmail: "   ", customerPhone: "" });
    expect(r.customerEmail).toBeNull();
    expect(r.customerPhone).toBeNull();
  });

  it("supprime les espaces de début et de fin des champs obligatoires", () => {
    const r = createRequestSchema.parse({ ...valid, customerName: "  Hôtel Kaloum  " });
    expect(r.customerName).toBe("Hôtel Kaloum");
  });

  it("n’accepte jamais de priorité ou de date depuis le client (RG5)", () => {
    const r = createRequestSchema.parse({ ...valid, isPriority: true, createdAt: "2020-01-01" });
    expect(r).not.toHaveProperty("isPriority");
    expect(r).not.toHaveProperty("createdAt");
  });

  it("exige un UUID de soumission valide (RG7)", () => {
    expect(issues({ ...valid, submissionId: "abc" })).toHaveProperty("submissionId");
  });
});

describe("priorité — RG18", () => {
  it("n’accepte qu’un booléen strict", () => {
    expect(setPrioritySchema.safeParse({ id: UUID, isPriority: true }).success).toBe(true);
    expect(setPrioritySchema.safeParse({ id: UUID, isPriority: "true" }).success).toBe(false);
    expect(setPrioritySchema.safeParse({ id: UUID, isPriority: 1 }).success).toBe(false);
    expect(setPrioritySchema.safeParse({ id: UUID }).success).toBe(false);
  });

  it("refuse un identifiant invalide (R14)", () => {
    expect(setPrioritySchema.safeParse({ id: "1; DROP TABLE x", isPriority: true }).success).toBe(false);
  });
});

describe("numéro de page — RG14", () => {
  it.each([
    [undefined, 1],
    ["2", 2],
    ["0", 1],
    ["-1", 1],
    ["abc", 1],
    ["1.5", 1],
  ])("%s → %i", (raw, expected) => {
    expect(pageSchema.parse(raw)).toBe(expected);
  });
});
