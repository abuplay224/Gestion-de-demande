import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { setRequestPriority } from "@/server/actions/set-request-priority";
import { countRequests, listRequests, PAGE_SIZE } from "@/server/queries/list-requests";
import { insertRequest, prisma, resetDb } from "../support/db";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);

describe("listRequests", () => {
  it("R07 — liste vide : page 1, total 0", async () => {
    expect(await listRequests(1)).toEqual({ items: [], total: 0, page: 1, pageSize: 20, pages: 1 });
    expect(await listRequests(5)).toMatchObject({ page: 1 });
  });

  it("R08 — plus de 20 demandes : ordre global (prioritaires, récentes, id) puis pagination", async () => {
    const tie = minutesAgo(500);
    const rows = [];
    for (let i = 0; i < 23; i++) rows.push(await insertRequest({ createdAt: minutesAgo(i * 10), isPriority: i % 7 === 0 }));
    // Deux demandes à la même date : départagées par identifiant décroissant
    rows.push(await insertRequest({ createdAt: tie }), await insertRequest({ createdAt: tie }));

    const expected = [...rows]
      .sort(
        (a, b) =>
          Number(b.isPriority) - Number(a.isPriority) ||
          b.createdAt.getTime() - a.createdAt.getTime() ||
          (b.id < a.id ? -1 : 1)
      )
      .map((r) => r.id);

    const p1 = await listRequests(1);
    const p2 = await listRequests(2);
    expect(p1).toMatchObject({ total: 25, pages: 2, page: 1 });
    expect(p1.items).toHaveLength(PAGE_SIZE);
    expect(p2.items).toHaveLength(5);
    expect([...p1.items, ...p2.items].map((r) => r.id)).toEqual(expected);
    // Les prioritaires sont en tête de la page 1, même si elles sont anciennes
    expect(p1.items.slice(0, 4).every((r) => r.isPriority)).toBe(true);
  });

  it("RG14 — une page hors bornes est ramenée à la dernière page valide", async () => {
    for (let i = 0; i < 21; i++) await insertRequest({ createdAt: minutesAgo(i) });
    expect(await listRequests(9999)).toMatchObject({ page: 2 });
    expect(await listRequests(0)).toMatchObject({ page: 1 });
  });

  it("compte les demandes et les prioritaires", async () => {
    await insertRequest({ isPriority: true });
    await insertRequest();
    await insertRequest();
    expect(await countRequests()).toEqual({ total: 3, priority: 1 });
  });
});

describe("setRequestPriority", () => {
  it("R09 — marque comme prioritaire : valeur persistée, date de modification, tri mis à jour", async () => {
    const recent = await insertRequest({ createdAt: minutesAgo(1) });
    const old = await insertRequest({ createdAt: minutesAgo(60) });

    const res = await setRequestPriority({ id: old.id, isPriority: true });

    expect(res).toMatchObject({ ok: true, data: { id: old.id, isPriority: true } });
    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: old.id } });
    expect(row.isPriority).toBe(true);
    expect(row.updatedAt.getTime()).toBeGreaterThan(old.updatedAt.getTime());
    expect((await listRequests(1)).items.map((r) => r.id)).toEqual([old.id, recent.id]);
    expect(revalidatePath).toHaveBeenCalledWith("/demandes");
  });

  it("R10 — retirer la priorité renvoie la demande dans l’ordre chronologique", async () => {
    const a = await insertRequest({ createdAt: minutesAgo(1) });
    const b = await insertRequest({ createdAt: minutesAgo(30), isPriority: true });
    const c = await insertRequest({ createdAt: minutesAgo(60) });

    await setRequestPriority({ id: b.id, isPriority: false });

    expect((await listRequests(1)).items.map((r) => r.id)).toEqual([a.id, b.id, c.id]);
  });

  it("R11 — la même valeur envoyée deux fois reste stable, sans toucher la date de modification", async () => {
    const r = await insertRequest({ isPriority: true });

    const first = await setRequestPriority({ id: r.id, isPriority: true });
    const second = await setRequestPriority({ id: r.id, isPriority: true });

    expect(first).toEqual(second);
    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: r.id } });
    expect(row.isPriority).toBe(true);
    expect(row.updatedAt).toEqual(r.updatedAt);
  });

  it("R13 — échec en base : ancien état conservé, nouvelle tentative possible", async () => {
    const r = await insertRequest();
    const spy = vi.spyOn(prisma.customerRequest, "updateMany").mockRejectedValueOnce(new Error("connexion perdue"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await setRequestPriority({ id: r.id, isPriority: true });

    expect(res).toEqual({
      ok: false,
      code: "INTERNAL_ERROR",
      message: "Impossible de modifier la priorité. L’état précédent est conservé.",
    });
    expect((await prisma.customerRequest.findUniqueOrThrow({ where: { id: r.id } })).isPriority).toBe(false);
    spy.mockRestore();

    expect(await setRequestPriority({ id: r.id, isPriority: true })).toMatchObject({ ok: true });
  });

  it("R14 — identifiant invalide ou inconnu : erreur contrôlée, aucune autre ligne modifiée", async () => {
    const other = await insertRequest();

    expect(await setRequestPriority({ id: "pas-un-uuid", isPriority: true })).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR",
    });
    expect(await setRequestPriority({ isPriority: true })).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await setRequestPriority({ id: other.id, isPriority: "true" })).toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await setRequestPriority({ id: randomUUID(), isPriority: true })).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });

    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: other.id } });
    expect(row.isPriority).toBe(false);
    expect(row.updatedAt).toEqual(other.updatedAt);
  });
});
