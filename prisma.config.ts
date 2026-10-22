import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Les commandes ciblant la base de test passent par scripts/with-test-db.mjs
    url: env("DATABASE_URL"),
  },
});
