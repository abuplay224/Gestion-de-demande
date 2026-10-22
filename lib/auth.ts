import "server-only";
import { createAuth } from "./auth-config";
import { prisma } from "./db";

/** Instance Better Auth de l’application (serveur uniquement). */
export const auth = createAuth(prisma);
