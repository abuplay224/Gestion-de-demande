import { beforeEach, describe, expect, it } from "vitest";
import { createRequest } from "@/server/actions/create-request";
import { setRequestPriority } from "@/server/actions/set-request-priority";
import { createUser, setUserActive, setUserRole } from "@/server/actions/users";
import { countRequests, listRequests } from "@/server/queries/list-requests";
import { listUsers } from "@/server/queries/list-users";
import { formInput, insertRequest, prisma, resetDb } from "../support/db";
import { ADMIN, AGENT, asUser } from "../support/session";

beforeEach(async () => {
  await resetDb();
});

const UNAUTHORIZED = { ok: false, code: "UNAUTHORIZED" };

describe("R15 — visiteur sans session, y compris appel direct d’une Server Action", () => {
  beforeEach(() => asUser(null));

  it("ne peut rien créer", async () => {
    expect(await createRequest(formInput())).toMatchObject(UNAUTHORIZED);
    expect(await prisma.customerRequest.count()).toBe(0);
  });

  it("ne peut pas modifier la priorité", async () => {
    asUser(AGENT);
    const r = await insertRequest();
    asUser(null);

    expect(await setRequestPriority({ id: r.id, isPriority: true })).toMatchObject(UNAUTHORIZED);
    expect((await prisma.customerRequest.findUniqueOrThrow({ where: { id: r.id } })).isPriority).toBe(false);
  });

  it("ne peut rien lire", async () => {
    await insertRequest();
    await expect(listRequests(1)).rejects.toThrow(/Accès réservé/);
    await expect(countRequests()).rejects.toThrow(/Accès réservé/);
  });

  it("ne peut pas gérer les comptes", async () => {
    expect(await createUser({ name: "Intrus", email: "x@x.gn", role: "admin", password: "motdepasse-123" })).toMatchObject(
      UNAUTHORIZED
    );
    await expect(listUsers()).rejects.toThrow(/Accès réservé/);
  });

  it("le refus est vérifié avant la validation : aucune information sur les données n’est renvoyée", async () => {
    const res = await createRequest({});
    expect(res).toMatchObject(UNAUTHORIZED);
    expect(res).not.toHaveProperty("fields");
  });
});

describe("rôles — un agent n’administre pas les comptes", () => {
  beforeEach(() => asUser(AGENT));

  it("l’agent garde l’accès aux demandes", async () => {
    expect(await createRequest(formInput())).toMatchObject({ ok: true });
    expect((await listRequests(1)).total).toBe(1);
  });

  it.each([
    ["createUser", () => createUser({ name: "Nouveau", email: "n@doztra.gn", role: "admin", password: "motdepasse-123" })],
    ["setUserRole", () => setUserRole({ userId: AGENT.id, role: "admin" })],
    ["setUserActive", () => setUserActive({ userId: "autre", active: false })],
  ])("%s est refusé à un agent", async (_, call) => {
    expect(await call()).toEqual({ ok: false, code: "UNAUTHORIZED", message: "Action réservée aux administrateurs." });
  });

  it("listUsers est refusé à un agent", async () => {
    await expect(listUsers()).rejects.toThrow("Action réservée aux administrateurs.");
  });
});

describe("garde-fous administrateur", () => {
  beforeEach(() => asUser(ADMIN));

  it("un administrateur ne peut ni changer son propre rôle ni se désactiver", async () => {
    expect(await setUserRole({ userId: ADMIN.id, role: "agent" })).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Vous ne pouvez pas modifier votre propre rôle.",
    });
    expect(await setUserActive({ userId: ADMIN.id, active: false })).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Vous ne pouvez pas désactiver votre propre compte.",
    });
  });

  it("valide les champs d’un nouveau compte (rôle inconnu, mot de passe court)", async () => {
    const res = await createUser({ name: "A", email: "pas-un-email", role: "superadmin", password: "court" });
    expect(res).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    if (res.ok) return;
    expect(Object.keys(res.fields ?? {}).sort()).toEqual(["email", "name", "password", "role"]);
  });
});
