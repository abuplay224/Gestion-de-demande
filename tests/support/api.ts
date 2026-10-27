import { createAuth, createCredentialUser } from "@/lib/auth-config";
import { resetRateLimits } from "@/lib/api/rate-limit";
import type { Role } from "@/lib/roles";
import { prisma } from "./db";

// Appels directs aux Route Handlers de l’API v1, sur la base de test.

type Params = { id: string };
type Handler = (req: Request, ctx: { params: Promise<Params> }) => Promise<Response>;

export type CallOptions = {
  body?: unknown;
  rawBody?: string;
  token?: string;
  headers?: Record<string, string>;
  params?: Params;
  query?: string;
};

export async function call(handler: Handler, method: string, options: CallOptions = {}) {
  const headers: Record<string, string> = { "x-forwarded-for": "203.0.113.7", ...options.headers };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  let body: string | undefined = options.rawBody;
  if (options.body !== undefined) {
    body = JSON.stringify(options.body);
    headers["content-type"] = "application/json";
  }
  const req = new Request(`http://localhost/api/v1/test${options.query ?? ""}`, { method, headers, body });
  const res = await handler(req, { params: Promise.resolve(options.params ?? { id: "" }) });
  const text = await res.text();
  return { status: res.status, headers: res.headers, json: text ? JSON.parse(text) : null, text };
}

export const PASSWORD = "motdepasse-api-123";

export async function resetApiState() {
  resetRateLimits();
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users" CASCADE`);
}

export async function createUser(email = "agent@doztra.test", role: Role = "agent") {
  return createCredentialUser(createAuth(prisma), { name: "Agent Mobile", email, password: PASSWORD, role });
}
