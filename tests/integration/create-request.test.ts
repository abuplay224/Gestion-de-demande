import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequest } from "@/server/actions/create-request";
import { formInput, prisma, resetDb } from "../support/db";

beforeEach(async () => {
  await resetDb();
  vi.clearAllMocks();
});

describe("createRequest", () => {
  it("R01 — crée une demande sans coordonnées, priorité normale, dates serveur", async () => {
    const before = Date.now();
    const input = formInput();
    const res = await createRequest(input);

    expect(res).toEqual({ ok: true, data: { id: input.submissionId } });
    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: input.submissionId } });
    expect(row).toMatchObject({
      customerName: "Hôtel Kaloum",
      customerEmail: null,
      customerPhone: null,
      isPriority: false,
    });
    expect(row.createdAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(row.updatedAt).toEqual(row.createdAt);
    expect(revalidatePath).toHaveBeenCalledWith("/demandes");
  });

  it("R02 — refuse un champ obligatoire vide ou hors limites, erreur au bon champ, aucune ligne", async () => {
    const res = await createRequest(formInput({ customerName: "   ", subject: "x".repeat(201), description: "court" }));

    expect(res).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    if (res.ok) return;
    expect(res.fields).toEqual({
      customerName: "Indiquez le nom du client ou de l’entreprise.",
      subject: "200 caractères maximum (actuellement 201).",
      description: "La description doit contenir au moins 10 caractères.",
    });
    expect(await prisma.customerRequest.count()).toBe(0);
  });

  it("R03 — refuse un e-mail invalide avec un message compréhensible", async () => {
    const res = await createRequest(formInput({ customerEmail: "nom@entreprise" }));
    expect(res).toMatchObject({
      ok: false,
      fields: { customerEmail: "Adresse e-mail invalide. Exemple : nom@entreprise.com" },
    });
    expect(await prisma.customerRequest.count()).toBe(0);
  });

  it("R04 — conserve à l’identique un téléphone avec + et zéro initial, et l’e-mail", async () => {
    const input = formInput({ customerPhone: "+224 0622 45 78 90", customerEmail: " fatou.bah@yahoo.fr " });
    await createRequest(input);
    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: input.submissionId } });
    expect(row.customerPhone).toBe("+224 0622 45 78 90");
    expect(row.customerEmail).toBe("fatou.bah@yahoo.fr");
  });

  it("R05 — un renvoi identique du même UUID ne crée qu’une demande", async () => {
    const input = formInput();
    const first = await createRequest(input);
    const second = await createRequest(input);

    expect(first).toEqual(second);
    expect(await prisma.customerRequest.count()).toBe(1);
  });

  it("R05 — deux envois simultanés du même UUID ne créent qu’une demande", async () => {
    const input = formInput();
    const results = await Promise.all([createRequest(input), createRequest(input), createRequest(input)]);

    expect(results.every((r) => r.ok)).toBe(true);
    expect(await prisma.customerRequest.count()).toBe(1);
  });

  it("deux demandes distinctes peuvent avoir exactement le même contenu (RG4)", async () => {
    await createRequest(formInput({ subject: "Même objet" }));
    await createRequest(formInput({ subject: "Même objet" }));
    expect(await prisma.customerRequest.count()).toBe(2);
  });

  it("R18 — même UUID, contenu différent : conflit explicite, aucun écrasement", async () => {
    const input = formInput();
    await createRequest(input);
    const res = await createRequest({ ...input, subject: "Objet modifié" });

    expect(res).toMatchObject({ ok: false, code: "CONFLICT" });
    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: input.submissionId } });
    expect(row.subject).toBe(input.subject);
  });

  it("R12 — base indisponible : erreur exploitable, aucun faux succès, rien de journalisé en clair", async () => {
    const spy = vi.spyOn(prisma.customerRequest, "create").mockRejectedValueOnce(new Error("connexion perdue"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const input = formInput({ customerEmail: "secret@client.gn" });

    const res = await createRequest(input);

    expect(res).toMatchObject({ ok: false, code: "INTERNAL_ERROR" });
    if (!res.ok) expect(res.message).toMatch(/Votre saisie est conservée/);
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(await prisma.customerRequest.count()).toBe(0);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).not.toContain(input.description);
    expect(logged).not.toContain("secret@client.gn");
    spy.mockRestore();
    log.mockRestore();

    // Nouvelle tentative avec le même UUID : enregistrée une seule fois
    expect(await createRequest(input)).toMatchObject({ ok: true });
    expect(await prisma.customerRequest.count()).toBe(1);
  });

  it("R19 — balises et tentative SQL stockées comme texte inoffensif", async () => {
    const payload = `<script>alert(1)</script>'); DROP TABLE customer_requests; --`;
    const input = formInput({ customerName: payload.slice(0, 150), description: payload });

    expect(await createRequest(input)).toMatchObject({ ok: true });
    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: input.submissionId } });
    expect(row.description).toBe(payload);
    expect(await prisma.customerRequest.count()).toBe(1);
  });

  it("accepte les caractères accentués et l’apostrophe typographique", async () => {
    const input = formInput({ customerName: "Djénabou Sylla — l’Épicerie", subject: "Résiliation d’un contrat" });
    await createRequest(input);
    const row = await prisma.customerRequest.findUniqueOrThrow({ where: { id: input.submissionId } });
    expect(row.customerName).toBe("Djénabou Sylla — l’Épicerie");
  });
});

describe("contraintes CHECK — la base est la dernière barrière", () => {
  it("refuse une écriture directe hors limites", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO customer_requests (id, customer_name, subject, description, updated_at)
        VALUES (gen_random_uuid(), ${"A"}, ${"Objet"}, ${"Description valide"}, now())`
    ).rejects.toThrow(/chk_customer_name_len/);
    await expect(
      prisma.$executeRaw`INSERT INTO customer_requests (id, customer_name, subject, description, customer_email, updated_at)
        VALUES (gen_random_uuid(), ${"Client"}, ${"Objet"}, ${"Description valide"}, ${""}, now())`
    ).rejects.toThrow(/chk_email_len/);
  });
});
