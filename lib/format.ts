const TZ = "Africa/Conakry";

export const fDate = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const fTime = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});

export function formatFull(d: Date) {
  return `${fDate.format(d)} · ${fTime.format(d)}`;
}

export function plural(n: number, word: string) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}
