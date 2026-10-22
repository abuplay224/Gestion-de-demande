import { APIError } from "better-auth/api";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createAuth, createCredentialUser } from "@/lib/auth-config";
import { prisma } from "../support/db";

// Configuration Better Auth réelle sur la base de test : mots de passe, inscription, comptes désactivés.
const auth = createAuth(prisma);
const PASSWORD = "motdepasse-solide-1";

const errorCode = async (p: Promise<unknown>) => {
  try {
    await p;
    return "OK";
  } catch (e) {
    return e instanceof APIError ? String(e.body?.code) : String(e);
  }
};

beforeAll(() => {
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
});

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE`);
});

describe("comptes e-mail + mot de passe", () => {
  it("crée un compte avec un mot de passe haché, jamais stocké en clair", async () => {
    const user = await createCredentialUser(auth, {
      name: "Aïssatou Camara",
      email: "  A.Camara@Doztra.GN ",
      password: PASSWORD,
      role: "agent",
    });

    expect(user).toMatchObject({ email: "a.camara@doztra.gn", role: "agent" });
    const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });
    expect(account.providerId).toBe("credential");
    expect(account.password).not.toContain(PASSWORD);
  });

  it("connecte avec le bon mot de passe, refuse un mauvais mot de passe ou un e-mail inconnu", async () => {
    await createCredentialUser(auth, { name: "Agent", email: "agent@doztra.gn", password: PASSWORD, role: "agent" });

    const ok = await auth.api.signInEmail({ body: { email: "agent@doztra.gn", password: PASSWORD } });
    expect(ok.user.email).toBe("agent@doztra.gn");
    expect(await errorCode(auth.api.signInEmail({ body: { email: "agent@doztra.gn", password: "mauvais-mdp-123" } }))).toBe(
      "INVALID_EMAIL_OR_PASSWORD"
    );
    expect(await errorCode(auth.api.signInEmail({ body: { email: "inconnu@doztra.gn", password: PASSWORD } }))).toBe(
      "INVALID_EMAIL_OR_PASSWORD"
    );
  });

  it("refuse toute inscription publique", async () => {
    const code = await errorCode(
      auth.api.signUpEmail({ body: { name: "Intrus", email: "intrus@exemple.com", password: PASSWORD } })
    );
    expect(code).not.toBe("OK");
    expect(await prisma.user.count()).toBe(0);
  });

  it("refuse la connexion d’un compte désactivé", async () => {
    const user = await createCredentialUser(auth, { name: "Ancien", email: "ancien@doztra.gn", password: PASSWORD, role: "agent" });
    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });

    expect(await errorCode(auth.api.signInEmail({ body: { email: "ancien@doztra.gn", password: PASSWORD } }))).toBe(
      "BANNED_USER"
    );
  });

  it("refuse un doublon d’e-mail et un mot de passe trop court", async () => {
    await createCredentialUser(auth, { name: "Agent", email: "agent@doztra.gn", password: PASSWORD, role: "agent" });
    await expect(
      createCredentialUser(auth, { name: "Agent 2", email: "AGENT@doztra.gn", password: PASSWORD, role: "agent" })
    ).rejects.toThrow(/existe déjà/);
    await expect(
      createCredentialUser(auth, { name: "Court", email: "court@doztra.gn", password: "court", role: "agent" })
    ).rejects.toThrow(/10 caractères/);
  });

  it("la base refuse tout rôle autre que admin ou agent", async () => {
    const user = await createCredentialUser(auth, { name: "Agent", email: "agent@doztra.gn", password: PASSWORD, role: "agent" });
    await expect(prisma.user.update({ where: { id: user.id }, data: { role: "superadmin" } })).rejects.toThrow(
      /chk_user_role/
    );
  });
});
