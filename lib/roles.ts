// Constantes partagées serveur / navigateur (aucune dépendance serveur).

export const ROLES = ["admin", "agent"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrateur",
  agent: "Agent",
};

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;
