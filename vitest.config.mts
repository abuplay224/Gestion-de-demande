import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // « server-only » lève une erreur hors du bundler Next : neutralisé dans les tests.
    alias: { "server-only": fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.ts"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/support/integration-setup.ts"],
          // Une seule base de test partagée : fichiers exécutés l’un après l’autre.
          fileParallelism: false,
        },
      },
    ],
  },
});
