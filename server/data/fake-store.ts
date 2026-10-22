import "server-only";
import type { CustomerRequest } from "@/lib/types";
import { buildSeed } from "@/prisma/seed-data";

/**
 * Dépôt en mémoire, provisoire : remplacé par Prisma/PostgreSQL à l’étape suivante.
 * Les données vivent tant que le serveur tourne (stockées sur globalThis pour survivre au HMR).
 *
 * DOZTRA_SIMULATE (facultatif) reproduit les états du prototype :
 *   empty   → aucune demande fictive
 *   error   → la lecture de la liste échoue
 *   slow    → lecture ralentie (squelette visible)
 *   failure → les écritures échouent
 */
export type Simulation = "empty" | "error" | "slow" | "failure" | undefined;
export const simulation = process.env.DOZTRA_SIMULATE as Simulation;


const g = globalThis as unknown as { __doztraStore?: CustomerRequest[] };

export function store(): CustomerRequest[] {
  g.__doztraStore ??= simulation === "empty" ? [] : buildSeed();
  return g.__doztraStore;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
