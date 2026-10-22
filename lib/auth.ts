import "server-only";

export type CurrentUser = { id: string; initials: string };

/**
 * Contexte utilisateur vérifié côté serveur.
 * Stub de démonstration : le mécanisme d’accès (fournisseur d’identité ou passerelle)
 * est une décision encore ouverte. À remplacer avant toute utilisation avec des données réelles.
 */
export async function requireUser(): Promise<CurrentUser> {
  return { id: "demo", initials: "AB" };
}
