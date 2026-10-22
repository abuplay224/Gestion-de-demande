import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

export { prisma };

/** Vide la table de la base de test (protégée par integration-setup.ts). */
export async function resetDb() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "customer_requests"`);
}

export async function insertRequest(overrides: Partial<Parameters<typeof prisma.customerRequest.create>[0]["data"]> = {}) {
  const at = overrides.createdAt ?? new Date();
  return prisma.customerRequest.create({
    data: {
      id: randomUUID(),
      customerName: "Client fictif",
      subject: "Objet fictif",
      description: "Description fictive suffisante",
      isPriority: false,
      createdAt: at,
      updatedAt: at,
      ...overrides,
    },
  });
}

export const formInput = (overrides: Record<string, unknown> = {}) => ({
  submissionId: randomUUID(),
  customerName: "Hôtel Kaloum",
  customerEmail: "",
  customerPhone: "",
  subject: "Coupure du service depuis ce matin",
  description: "Le système de réservation est inaccessible pour la réception.",
  ...overrides,
});
