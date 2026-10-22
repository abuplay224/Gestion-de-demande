import { describe, expect, it } from "vitest";
import {
  AVATAR_PALETTE,
  avatarClass,
  initials,
  mailtoHref,
  priorityLabel,
  telHref,
} from "@/components/demandes/request-view";
import { fDate, formatFull, fTime, plural } from "@/lib/format";

describe("initiales", () => {
  it.each([
    ["Société Minière de Boké", "SM"],
    ["Orange Guinée — Direction IT", "OG"],
    ["Ets Kouyaté & Fils", "EK"],
    ["Total Énergies Guinée", "TÉ"],
    ["Mariama Diallo", "MD"],
    ["madame diallo", "M"],
  ])("%s → %s", (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe("couleur d’avatar", () => {
  it("est déterministe et dépend du dernier octet de l’identifiant", () => {
    expect(avatarClass("00000000-0000-4000-8000-000000000000")).toBe(AVATAR_PALETTE[0]);
    expect(avatarClass("00000000-0000-4000-8000-000000000003")).toBe(AVATAR_PALETTE[3]);
    expect(avatarClass("00000000-0000-4000-8000-000000000007")).toBe(AVATAR_PALETTE[1]);
  });
});

describe("liens de contact", () => {
  it("mailto conserve l’arobase et encode le reste", () => {
    expect(mailtoHref("dsi@orange-guinee.com")).toBe("mailto:dsi@orange-guinee.com");
    expect(mailtoHref("a?b@x.com")).toBe("mailto:a%3Fb@x.com");
  });

  it("tel retire les espaces du lien seulement et garde le +", () => {
    expect(telHref("+224 622 10 45 87")).toBe("tel:+224622104587");
    expect(telHref("0622 45 78 90")).toBe("tel:0622457890");
  });
});

describe("libellé de priorité", () => {
  it("suit l’état confirmé et l’envoi en cours", () => {
    expect(priorityLabel(false, false)).toBe("Marquer comme prioritaire");
    expect(priorityLabel(true, false)).toBe("Retirer la priorité");
    expect(priorityLabel(true, true)).toBe("Mise à jour…");
  });
});

describe("dates — fuseau Africa/Conakry", () => {
  const d = new Date("2026-10-21T06:42:00Z");

  it("formate en français, indépendamment du fuseau de la machine", () => {
    expect(fDate.format(d)).toBe("21 oct. 2026");
    expect(fTime.format(d)).toBe("06:42");
    expect(formatFull(d)).toBe("21 oct. 2026 · 06:42");
  });

  it("change de jour à minuit UTC (Conakry = UTC+0)", () => {
    expect(fDate.format(new Date("2026-10-20T23:59:00Z"))).toBe("20 oct. 2026");
  });

  it("accorde le pluriel", () => {
    expect(plural(1, "demande")).toBe("1 demande");
    expect(plural(26, "demande")).toBe("26 demandes");
  });
});
