import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { PATCH as setPriority } from "@/app/api/v1/requests/[id]/priority/route";
import { GET as getOne } from "@/app/api/v1/requests/[id]/route";
import { GET as list, POST as create } from "@/app/api/v1/requests/route";
import { call, createUser, PASSWORD, resetApiState } from "../support/api";
import { formInput, insertRequest, prisma, resetDb } from "../support/db";

let token: string;

beforeEach(async () => {
  await resetDb();
  await resetApiState();
  vi.clearAllMocks();
  await createUser();
  token = (await call(login, "POST", { body: { email: "agent@doztra.test", password: PASSWORD } })).json.data.accessToken;
});

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe("GET /requests", () => {
  it("liste paginée triée (prioritaires, récentes), dates ISO UTC", async () => {
    const old = await insertRequest({ createdAt: minutesAgo(60), isPriority: true });
    const recent = await insertRequest({ createdAt: minutesAgo(1) });

    const res = await call(list, "GET", { token });
    expect(res.status).toBe(200);
    expect(res.json.data).toMatchObject({ total: 2, page: 1, pageSize: 20, pages: 1 });
    expect(res.json.data.items.map((r: { id: string }) => r.id)).toEqual([old.id, recent.id]);
    expect(res.json.data.items[0].createdAt).toBe(old.createdAt.toISOString());
    expect(Object.keys(res.json.data.items[0]).sort()).toEqual(
      ["createdAt", "customerEmail", "customerName", "customerPhone", "description", "id", "isPriority", "subject", "updatedAt"]
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("RG14 — page hors bornes ou invalide : page corrigée renvoyée, pas de redirection", async () => {
    for (let i = 0; i < 21; i++) await insertRequest({ createdAt: minutesAgo(i) });
    expect((await call(list, "GET", { token, query: "?page=99" })).json.data).toMatchObject({ page: 2, pages: 2 });
    expect((await call(list, "GET", { token, query: "?page=abc" })).json.data.page).toBe(1);
    expect((await call(list, "GET", { token, query: "?page=2" })).json.data.items).toHaveLength(1);
  });
});

describe("POST /requests — tableau des statuts", () => {
  it("201 — créée, priorité normale, coordonnées vides → null ; le web est invalidé", async () => {
    const input = formInput({ customerPhone: " +224 0622 45 78 90 " });
    const res = await call(create, "POST", { token, body: input });

    expect(res.status).toBe(201);
    expect(res.json.data).toMatchObject({
      id: input.submissionId,
      isPriority: false,
      customerEmail: null,
      customerPhone: "+224 0622 45 78 90",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/demandes");
  });

  it("200 — même submissionId, même contenu : demande existante renvoyée, aucune nouvelle ligne (R05)", async () => {
    const input = formInput();
    await call(create, "POST", { token, body: input });
    const again = await call(create, "POST", { token, body: input });
    expect(again.status).toBe(200);
    expect(again.json.data.id).toBe(input.submissionId);
    expect(await prisma.customerRequest.count()).toBe(1);
  });

  it("R05 — envois concurrents du même submissionId : une seule ligne", async () => {
    const input = formInput();
    const results = await Promise.all([1, 2, 3].map(() => call(create, "POST", { token, body: input })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 201]);
    expect(await prisma.customerRequest.count()).toBe(1);
  });

  it("409 — même submissionId, contenu différent : conflit, aucun écrasement (R18)", async () => {
    const input = formInput();
    await call(create, "POST", { token, body: input });
    const res = await call(create, "POST", { token, body: { ...input, subject: "Autre objet" } });
    expect(res.status).toBe(409);
    expect(res.json.error.code).toBe("CONFLICT");
    expect((await prisma.customerRequest.findUniqueOrThrow({ where: { id: input.submissionId } })).subject).toBe(input.subject);
  });

  it("422 — validation : erreurs par champ, aucune ligne (R02, R03)", async () => {
    const res = await call(create, "POST", {
      token,
      body: formInput({ customerName: " ", customerEmail: "nom@entreprise", description: "court" }),
    });
    expect(res.status).toBe(422);
    expect(res.json.error).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: {
        customerName: "Indiquez le nom du client ou de l’entreprise.",
        customerEmail: "Adresse e-mail invalide. Exemple : nom@entreprise.com",
        description: "La description doit contenir au moins 10 caractères.",
      },
    });
    expect(await prisma.customerRequest.count()).toBe(0);
  });

  it("422 — submissionId absent ou non UUID", async () => {
    const res = await call(create, "POST", { token, body: formInput({ submissionId: "123" }) });
    expect(res.status).toBe(422);
    expect(res.json.error.fields).toHaveProperty("submissionId");
  });

  it("503 — base indisponible : message exploitable, aucune exception brute (R12)", async () => {
    const spy = vi.spyOn(prisma.customerRequest, "create").mockRejectedValueOnce(new Error("ECONNREFUSED 10.0.0.5:5432"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call(create, "POST", { token, body: formInput() });
    spy.mockRestore();

    expect(res.status).toBe(503);
    expect(res.json.error.code).toBe("INTERNAL_ERROR");
    expect(res.text).not.toContain("ECONNREFUSED");
    expect(await prisma.customerRequest.count()).toBe(0);
  });

  it("R19 — balises et tentative SQL stockées et renvoyées telles quelles", async () => {
    const payload = `<img src=x onerror=alert(1)>'); DROP TABLE customer_requests; --`;
    const res = await call(create, "POST", { token, body: formInput({ description: payload }) });
    expect(res.status).toBe(201);
    expect(res.json.data.description).toBe(payload);
    expect(await prisma.customerRequest.count()).toBe(1);
  });

  it("le client ne peut fixer ni la priorité, ni les dates (RG5)", async () => {
    const res = await call(create, "POST", {
      token,
      body: { ...formInput(), isPriority: true, createdAt: "2020-01-01T00:00:00.000Z" },
    });
    expect(res.json.data.isPriority).toBe(false);
    expect(res.json.data.createdAt).not.toBe("2020-01-01T00:00:00.000Z");
  });
});

describe("GET /requests/{id}", () => {
  it("200 — détail ; 404 — inconnu ; 422 — identifiant invalide", async () => {
    const r = await insertRequest();
    expect((await call(getOne, "GET", { token, params: { id: r.id } })).json.data.id).toBe(r.id);
    expect((await call(getOne, "GET", { token, params: { id: randomUUID() } })).status).toBe(404);
    expect((await call(getOne, "GET", { token, params: { id: "pas-un-uuid" } })).status).toBe(422);
  });
});

describe("PATCH /requests/{id}/priority", () => {
  it("200 — valeur persistée, date de modification, web invalidé (R09)", async () => {
    const r = await insertRequest({ createdAt: minutesAgo(10) });
    const res = await call(setPriority, "PATCH", { token, params: { id: r.id }, body: { isPriority: true } });
    expect(res.status).toBe(200);
    expect(res.json.data).toMatchObject({ id: r.id, isPriority: true });
    expect(new Date(res.json.data.updatedAt).getTime()).toBeGreaterThan(r.updatedAt.getTime());
    expect(revalidatePath).toHaveBeenCalledWith("/demandes");
  });

  it("même valeur deux fois : état stable, updatedAt inchangé (R11, RG19)", async () => {
    const r = await insertRequest({ isPriority: true });
    const res = await call(setPriority, "PATCH", { token, params: { id: r.id }, body: { isPriority: true } });
    expect(res.json.data.updatedAt).toBe(r.updatedAt.toISOString());
  });

  it("422 — booléen strict exigé (RG18) ; 404 — inconnu ; 422 — identifiant invalide (R14)", async () => {
    const r = await insertRequest();
    for (const body of [{ isPriority: "true" }, { isPriority: 1 }, {}, { toggle: true }]) {
      expect((await call(setPriority, "PATCH", { token, params: { id: r.id }, body })).status).toBe(422);
    }
    expect((await call(setPriority, "PATCH", { token, params: { id: randomUUID() }, body: { isPriority: true } })).status).toBe(404);
    expect((await call(setPriority, "PATCH", { token, params: { id: "1;DROP" }, body: { isPriority: true } })).status).toBe(422);
    expect((await prisma.customerRequest.findUniqueOrThrow({ where: { id: r.id } })).isPriority).toBe(false);
  });
});

describe("R15 — chaque route de données sans jeton : aucune lecture ni écriture", () => {
  it.each([
    ["GET /requests", () => call(list, "GET")],
    ["POST /requests", () => call(create, "POST", { body: formInput() })],
    ["GET /requests/{id}", () => call(getOne, "GET", { params: { id: randomUUID() } })],
    ["PATCH /requests/{id}/priority", () => call(setPriority, "PATCH", { params: { id: randomUUID() }, body: { isPriority: true } })],
  ])("%s → 401", async (_, request) => {
    await insertRequest();
    const res = await request();
    expect(res.status).toBe(401);
    expect(res.text).not.toContain("Client fictif");
    expect(await prisma.customerRequest.count()).toBe(1);
  });
});
