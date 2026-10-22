// Aides de présentation partagées par le tableau, les cartes et le panneau.

// Palette d’avatars (fond, texte) — même ordre que le prototype.
export const AVATAR_PALETTE = [
  "bg-doztra-av1-bg text-doztra-av1-fg",
  "bg-doztra-av2-bg text-doztra-av2-fg",
  "bg-doztra-av3-bg text-doztra-av3-fg",
  "bg-doztra-av4-bg text-doztra-av4-fg",
  "bg-doztra-av5-bg text-doztra-av5-fg",
  "bg-doztra-av6-bg text-doztra-av6-fg",
] as const;

/** Couleur déterministe : dernier octet de l’identifiant modulo 6. */
export function avatarClass(id: string) {
  const byte = parseInt(id.slice(-2), 16);
  return AVATAR_PALETTE[(Number.isNaN(byte) ? 0 : byte) % AVATAR_PALETTE.length];
}

/** Initiales des deux premiers mots commençant par une majuscule (règle du prototype). */
export function initials(name: string) {
  const words = name
    .replace(/[—&-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && w[0] === w[0].toUpperCase() && /[A-Za-zÀ-ÿ]/.test(w[0]));
  return ((words[0] || name)[0] + ((words[1] || "")[0] || "")).toUpperCase();
}

export function mailtoHref(email: string) {
  return `mailto:${encodeURIComponent(email).replace(/%40/g, "@")}`;
}

/** Le lien retire les espaces ; la valeur affichée et stockée reste intacte (RG3). */
export function telHref(phone: string) {
  return `tel:${encodeURIComponent(phone.replace(/\s/g, "")).replace(/%2B/g, "+")}`;
}

export function priorityLabel(isPriority: boolean, pending: boolean) {
  if (pending) return "Mise à jour…";
  return isPriority ? "Retirer la priorité" : "Marquer comme prioritaire";
}
