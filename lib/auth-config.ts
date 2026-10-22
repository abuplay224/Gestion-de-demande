// Configuration Better Auth partagée par l’application (lib/auth.ts), le script de
// création d’administrateur et les tests. Pas de « server-only » ici : ce module est
// aussi chargé hors de Next.js. Ne jamais l’importer depuis un Client Component.
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";
import type { PrismaClient } from "@/generated/prisma/client";
import { PASSWORD_MAX, PASSWORD_MIN, type Role } from "./roles";

export type { Role };

// Admin : gère les comptes (créer, lister, rôle, désactiver, mot de passe), sans
// usurpation d’identité ni suppression. Agent : aucun droit d’administration.
const ac = createAccessControl(defaultStatements);
const roles = {
  admin: ac.newRole({
    user: ["create", "list", "get", "set-role", "ban", "set-password"],
    session: ["list", "revoke"],
  }),
  agent: ac.newRole({ user: [], session: [] }),
};

export function createAuth(prisma: PrismaClient) {
  return betterAuth({
    appName: "Doztra Demandes",
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // comptes créés par un administrateur uniquement
      minPasswordLength: PASSWORD_MIN,
      maxPasswordLength: PASSWORD_MAX,
    },
    session: {
      expiresIn: 60 * 60 * 12, // 12 h
      updateAge: 60 * 60, // prolongée au plus une fois par heure
    },
    plugins: [
      admin({ ac, roles, defaultRole: "agent", adminRoles: ["admin"] }),
      nextCookies(), // pose les cookies depuis les Server Actions ; doit rester en dernier
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/**
 * Crée un compte e-mail + mot de passe sans passer par une session administrateur.
 * Réservé au script `admin:create` et aux tests ; dans l’application, un administrateur
 * crée les comptes via auth.api.createUser.
 */
export async function createCredentialUser(
  auth: Auth,
  input: { name: string; email: string; password: string; role: Role }
) {
  const ctx = await auth.$context;
  const email = input.email.trim().toLowerCase();
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    throw new Error(`Un compte existe déjà pour ${email}`);
  }
  if (input.password.length < PASSWORD_MIN) {
    throw new Error(`Le mot de passe doit contenir au moins ${PASSWORD_MIN} caractères`);
  }
  const user = await ctx.internalAdapter.createUser({
    name: input.name.trim(),
    email,
    emailVerified: true,
    role: input.role,
  }, { method: "admin" });
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(input.password),
  });
  return user;
}
