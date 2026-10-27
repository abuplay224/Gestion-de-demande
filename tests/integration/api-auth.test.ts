import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { GET as me } from "@/app/api/v1/auth/me/route";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { GET as health } from "@/app/api/v1/health/route";
import { GET as listRequests } from "@/app/api/v1/requests/route";
import { call, createUser, PASSWORD, resetApiState } from "../support/api";
import { prisma } from "../support/db";

beforeEach(async () => {
  await resetApiState();
});

async function signIn(email = "agent@doztra.test") {
  const res = await call(login, "POST", { body: { email, password: PASSWORD, deviceName: "Test" } });
  expect(res.status).toBe(200);
  return res.json.data as { accessToken: string; refreshToken: string };
}

describe("GET /health", () => {
  it("répond sans authentification, sans détail d’infrastructure", async () => {
    const res = await call(health, "GET");
    expect(res.status).toBe(200);
    expect(res.json).toEqual({ data: { status: "ok", version: "1.0.0" } });
  });
});

describe("POST /auth/login", () => {
  it("renvoie une paire de jetons et l’utilisateur ; seuls les hachages sont stockés", async () => {
    await createUser();
    const res = await call(login, "POST", { body: { email: " Agent@Doztra.test ", password: PASSWORD } });

    expect(res.status).toBe(200);
    const d = res.json.data;
    expect(d).toMatchObject({
      tokenType: "Bearer",
      user: { email: "agent@doztra.test", name: "Agent Mobile", role: "agent" },
    });
    expect(d.accessToken).toMatch(/^dza_/);
    expect(d.refreshToken).toMatch(/^dzr_/);
    expect(new Date(d.accessTokenExpiresAt).getTime() - Date.now()).toBeLessThanOrEqual(15 * 60_000);
    const row = await prisma.apiSession.findFirstOrThrow();
    expect(row.deviceName).toBeNull();
    expect(JSON.stringify(row)).not.toContain(d.accessToken);
    expect(JSON.stringify(row)).not.toContain(d.refreshToken);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("même message pour un mauvais mot de passe et un e-mail inconnu (401)", async () => {
    await createUser();
    const wrong = await call(login, "POST", { body: { email: "agent@doztra.test", password: "mauvais-mdp-123" } });
    const unknown = await call(login, "POST", { body: { email: "inconnu@doztra.test", password: PASSWORD } });
    for (const res of [wrong, unknown]) {
      expect(res.status).toBe(401);
      expect(res.json.error).toEqual({ code: "UNAUTHORIZED", message: "E-mail ou mot de passe incorrect." });
    }
  });

  it("compte désactivé : 403, aucune session ouverte", async () => {
    const user = await createUser();
    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });
    const res = await call(login, "POST", { body: { email: "agent@doztra.test", password: PASSWORD } });
    expect(res.status).toBe(403);
    expect(res.json.error.message).toMatch(/désactivé/);
    expect(await prisma.apiSession.count()).toBe(0);
  });

  it("422 avec les champs manquants ; 422 sur un JSON invalide ; 413 au-delà de 64 Ko", async () => {
    const missing = await call(login, "POST", { body: {} });
    expect(missing.status).toBe(422);
    expect(Object.keys(missing.json.error.fields).sort()).toEqual(["email", "password"]);

    const broken = await call(login, "POST", { rawBody: "{pas du json", headers: { "content-type": "application/json" } });
    expect(broken.status).toBe(422);

    const huge = await call(login, "POST", { body: { email: "a@b.gn", password: "x".repeat(70_000) } });
    expect(huge.status).toBe(413);
    expect(huge.json.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("limite les tentatives : 429 + Retry-After après 5 essais sur un compte", async () => {
    await createUser();
    for (let i = 0; i < 5; i++) {
      await call(login, "POST", { body: { email: "agent@doztra.test", password: "mauvais-mdp-123" } });
    }
    const res = await call(login, "POST", { body: { email: "agent@doztra.test", password: PASSWORD } });
    expect(res.status).toBe(429);
    expect(res.json.error.code).toBe("RATE_LIMITED");
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("jeton d’accès — R15 version mobile", () => {
  it("GET /auth/me avec un jeton valide", async () => {
    await createUser();
    const { accessToken } = await signIn();
    const res = await call(me, "GET", { token: accessToken });
    expect(res.status).toBe(200);
    expect(res.json.data).toMatchObject({ email: "agent@doztra.test", role: "agent" });
    expect(res.json.data).not.toHaveProperty("sessionId");
  });

  it.each([
    ["absent", undefined],
    ["forgé", "dza_jeton-invente-de-toutes-pieces"],
    ["d’un autre format", "eyJhbGciOiJub25lIn0.e30."],
  ])("jeton %s → 401, aucune donnée", async (_, token) => {
    const res = await call(listRequests, "GET", { token });
    expect(res.status).toBe(401);
    expect(res.json).toEqual({ error: expect.objectContaining({ code: "UNAUTHORIZED" }) });
  });

  it("jeton expiré → 401", async () => {
    await createUser();
    const { accessToken } = await signIn();
    await prisma.apiSession.updateMany({ data: { accessExpiresAt: new Date(Date.now() - 1000) } });
    expect((await call(me, "GET", { token: accessToken })).status).toBe(401);
  });

  it("compte désactivé après connexion → 403 (l’app déconnecte)", async () => {
    const user = await createUser();
    const { accessToken } = await signIn();
    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });
    const res = await call(listRequests, "GET", { token: accessToken });
    expect(res.status).toBe(403);
    expect(res.json.error.code).toBe("UNAUTHORIZED");
  });

  it("le jeton ne passe jamais dans l’URL : un jeton en paramètre est ignoré", async () => {
    await createUser();
    const { accessToken } = await signIn();
    const res = await call(listRequests, "GET", { query: `?access_token=${accessToken}` });
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/refresh — rotation à usage unique", () => {
  it("renvoie une nouvelle paire ; l’ancien jeton d’accès et l’ancien jeton de rafraîchissement ne valent plus rien", async () => {
    await createUser();
    const first = await signIn();
    const res = await call(refresh, "POST", { body: { refreshToken: first.refreshToken } });
    expect(res.status).toBe(200);
    const second = res.json.data;
    expect(second.refreshToken).not.toBe(first.refreshToken);

    expect((await call(me, "GET", { token: first.accessToken })).status).toBe(401);
    expect((await call(me, "GET", { token: second.accessToken })).status).toBe(200);
  });

  it("réutiliser un jeton déjà consommé révoque la session (vol présumé)", async () => {
    await createUser();
    const first = await signIn();
    const second = (await call(refresh, "POST", { body: { refreshToken: first.refreshToken } })).json.data;

    const replay = await call(refresh, "POST", { body: { refreshToken: first.refreshToken } });
    expect(replay.status).toBe(401);
    // La session légitime est révoquée elle aussi : il faut se reconnecter
    expect((await call(me, "GET", { token: second.accessToken })).status).toBe(401);
    expect((await call(refresh, "POST", { body: { refreshToken: second.refreshToken } })).status).toBe(401);
  });

  it("deux rafraîchissements simultanés avec le même jeton : un seul réussit", async () => {
    await createUser();
    const { refreshToken } = await signIn();
    const results = await Promise.all([
      call(refresh, "POST", { body: { refreshToken } }),
      call(refresh, "POST", { body: { refreshToken } }),
    ]);
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
  });

  it("jeton de rafraîchissement expiré → 401 ; compte désactivé → 403", async () => {
    const user = await createUser();
    const a = await signIn();
    await prisma.apiSession.updateMany({ data: { refreshExpiresAt: new Date(Date.now() - 1000) } });
    expect((await call(refresh, "POST", { body: { refreshToken: a.refreshToken } })).status).toBe(401);

    const b = await signIn();
    await prisma.user.update({ where: { id: user.id }, data: { banned: true } });
    expect((await call(refresh, "POST", { body: { refreshToken: b.refreshToken } })).status).toBe(403);
  });
});

describe("POST /auth/logout", () => {
  it("révoque la session de l’appareil (204), idempotent", async () => {
    await createUser();
    const { accessToken, refreshToken } = await signIn();
    expect((await call(logout, "POST", { token: accessToken })).status).toBe(204);
    expect((await call(me, "GET", { token: accessToken })).status).toBe(401);
    expect((await call(refresh, "POST", { body: { refreshToken } })).status).toBe(401);
    expect((await call(logout, "POST", { token: accessToken })).status).toBe(204);
  });

  it("accepte le jeton de rafraîchissement quand le jeton d’accès a expiré", async () => {
    await createUser();
    const { refreshToken } = await signIn();
    expect((await call(logout, "POST", { body: { refreshToken } })).status).toBe(204);
    expect((await call(refresh, "POST", { body: { refreshToken } })).status).toBe(401);
  });

  it("sans aucun jeton → 401", async () => {
    expect((await call(logout, "POST")).status).toBe(401);
  });

  it("ne touche pas les autres appareils de l’utilisateur", async () => {
    await createUser();
    const phone = await signIn();
    const tablet = await signIn();
    await call(logout, "POST", { token: phone.accessToken });
    expect((await call(me, "GET", { token: tablet.accessToken })).status).toBe(200);
  });
});

describe("version minimale de l’app", () => {
  it("426 si X-App-Version est plus ancienne que MOBILE_MIN_APP_VERSION ; health toujours accessible", async () => {
    process.env.MOBILE_MIN_APP_VERSION = "1.2.0";
    try {
      const old = await call(login, "POST", { body: {}, headers: { "x-app-version": "1.1.9" } });
      expect(old.status).toBe(426);
      expect(old.json.error.code).toBe("UPGRADE_REQUIRED");
      expect(old.headers.get("x-min-app-version")).toBe("1.2.0");
      expect((await call(login, "POST", { body: {} })).status).toBe(426); // en-tête absent
      expect((await call(login, "POST", { body: {}, headers: { "x-app-version": "1.10.0" } })).status).toBe(422);
      expect((await call(health, "GET", { headers: { "x-app-version": "0.1.0" } })).status).toBe(200);
    } finally {
      delete process.env.MOBILE_MIN_APP_VERSION;
    }
  });
});
