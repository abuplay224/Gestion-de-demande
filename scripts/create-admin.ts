// Crée un compte administrateur (premier accès, ou secours) :
//   npm run admin:create -- --email prenom.nom@doztra.com --name "Prénom Nom"
// Le mot de passe est demandé sans écho (ou lu dans ADMIN_PASSWORD pour l’automatisation).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { PrismaClient } from "../generated/prisma/client";
import { createAuth, createCredentialUser } from "../lib/auth-config";

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
    let muted = false;
    out._writeToOutput = (s) => {
      if (!muted || s.includes("\n")) out.output.write(muted ? "\n" : s);
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

async function main() {
  const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
  if (!values.email || !values.name) {
    throw new Error('Usage : npm run admin:create -- --email adresse@doztra.com --name "Prénom Nom"');
  }
  const password =
    process.env.ADMIN_PASSWORD ?? (await askHidden("Mot de passe (10 caractères minimum) : "));
  if (!process.env.ADMIN_PASSWORD && password !== (await askHidden("Confirmez le mot de passe : "))) {
    throw new Error("Les deux mots de passe ne correspondent pas.");
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n’est pas défini");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const user = await createCredentialUser(createAuth(prisma), {
      name: values.name,
      email: values.email,
      password,
      role: "admin",
    });
    console.log(`Administrateur créé : ${user.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
