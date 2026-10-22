import "server-only";
import type { CustomerRequest } from "@/lib/types";

/**
 * Dépôt en mémoire, provisoire : remplacé par Prisma/PostgreSQL à l’étape suivante.
 * Les données vivent tant que le serveur tourne (stockées sur globalThis pour survivre au HMR).
 *
 * DOZTRA_SIMULATE (facultatif) reproduit les états du prototype :
 *   empty   → aucune demande fictive
 *   error   → la lecture de la liste échoue
 *   slow    → lecture ralentie (squelette visible)
 *   failure → les écritures échouent
 */
export type Simulation = "empty" | "error" | "slow" | "failure" | undefined;
export const simulation = process.env.DOZTRA_SIMULATE as Simulation;

type Seed = [string, string, string, string | null, string | null, boolean];

const SEED: Seed[] = [
  ["Société Minière de Boké", "Retard de livraison des pièces de rechange", "Les pièces commandées le 2 octobre ne sont toujours pas arrivées sur le site de Kamsar. Merci de nous indiquer une date de livraison ferme, la ligne 3 est à l'arrêt.", "achats@smb-gn.com", "+224 622 10 45 87", true],
  ["Mariama Diallo", "Facture du mois de septembre incorrecte", "Le montant facturé ne correspond pas au devis signé : une ligne de maintenance apparaît deux fois. Pouvez-vous émettre un avoir ?", "mariama.diallo@gmail.com", "+224 620 04 11 32", false],
  ["Orange Guinée — Direction IT", "Demande de devis pour 40 postes", "Nous souhaitons recevoir un devis pour l'équipement de 40 postes de travail (configuration standard bureautique) avant fin novembre.", "dsi@orange-guinee.com", null, false],
  ["Hôtel Kaloum", "Coupure du service depuis ce matin", "Depuis 7h ce matin, le système de réservation est inaccessible pour la réception. Les clients attendent au comptoir.", null, "+224 657 33 90 01", true],
  ["Alpha Condé Transports", "Changement d’adresse de facturation", "Merci de mettre à jour notre adresse de facturation : Immeuble Al Iman, Kaloum, Conakry.", "compta@act-transports.gn", null, false],
  ["Fatoumata Bah", "Question sur la garantie", "Mon appareil acheté en mars présente un défaut d'écran. Est-il toujours couvert par la garantie et quelle est la procédure ?", "fatou.bah@yahoo.fr", "0622 45 78 90", false],
  ["Clinique Pasteur", "Accès bloqué pour deux utilisateurs", "Deux de nos secrétaires ne peuvent plus se connecter depuis la mise à jour d'hier. Message : compte verrouillé.", "it@clinique-pasteur.gn", "+224 664 12 00 00", true],
  ["Ibrahima Sow", "Demande de rappel", "Bonjour, je souhaite être rappelé pour discuter d'un abonnement entreprise. Disponible après 15h.", null, "+224 621 98 76 54", false],
  ["Groupe Sonoco", "Formation des nouveaux agents", "Nous recrutons 6 agents en novembre et souhaitons planifier une session de formation sur l'outil.", "rh@sonoco.gn", null, false],
  ["Boulangerie Le Fournil", "Terminal de paiement hors service", "Le terminal affiche une erreur de connexion depuis hier soir. Nous ne pouvons plus accepter les cartes.", null, "+224 628 55 21 09", false],
  ["Aïssatou Camara", "Résiliation de contrat", "Je souhaite résilier mon contrat à compter du 1er décembre. Merci de me confirmer les démarches.", "a.camara@outlook.com", null, false],
  ["Port Autonome de Conakry", "Extension du contrat de maintenance", "Nous voulons étendre le contrat de maintenance au terminal à conteneurs. Merci de nous proposer un avenant.", "contrats@portconakry.gn", "+224 631 00 22 44", false],
  ["Mamadou Barry", "Erreur sur le bon de commande", "Le bon n° 2041 indique 12 unités au lieu de 21. Merci de corriger avant expédition.", "m.barry@gmail.com", null, false],
  ["Université Gamal Abdel Nasser", "Partenariat pour stages", "Le département informatique souhaite proposer des stagiaires à Doztra pour le semestre prochain.", "partenariats@uganc.edu.gn", null, false],
  ["Kadiatou Touré", "Mot de passe oublié", "Je n'arrive pas à réinitialiser mon mot de passe, le lien reçu par e-mail a expiré.", "kadi.toure@gmail.com", null, false],
  ["Ets Kouyaté & Fils", "Demande de catalogue", "Pouvez-vous nous envoyer le catalogue 2026 avec les tarifs revendeurs ?", "contact@kouyate-fils.com", "+224 655 67 43 21", false],
  ["Moussa Keïta", "Réclamation livraison endommagée", "Le colis reçu ce matin était ouvert et un article manque. Photos disponibles sur demande.", null, "+224 624 11 88 77", false],
  ["Ministère du Commerce — DSI", "Audit de sécurité", "Dans le cadre de notre audit annuel, nous demandons la documentation des mesures de sécurité appliquées.", "dsi@commerce.gov.gn", null, false],
  ["Djénabou Sylla", "Modification de rendez-vous", "Je ne pourrai pas être présente jeudi. Est-il possible de décaler l'intervention à lundi ?", "djenabou.s@gmail.com", "+224 669 30 40 50", false],
  ["Restaurant Le Damier", "Facture en double", "Nous avons reçu deux factures identiques pour octobre. Laquelle devons-nous régler ?", "gerance@ledamier.gn", null, false],
  ["Ousmane Diakité", "Demande d’information tarifs", "Quels sont vos tarifs pour une petite entreprise de 5 personnes ?", null, null, false],
  ["Total Énergies Guinée", "Remplacement du matériel réseau", "Nous planifions le remplacement des commutateurs du siège. Merci de nous recontacter pour une visite technique.", "achats.gn@totalenergies.com", "+224 622 00 00 11", false],
  ["Hawa Kaba", "Problème d’affichage application", "Sur mon téléphone, la page de suivi est coupée à droite. Modèle : Tecno Spark 10.", "hawa.kaba@gmail.com", null, false],
  ["Cabinet Juridique Bangoura", "Confidentialité des données", "Nous souhaitons connaître le lieu d'hébergement de nos données et la durée de conservation.", "contact@cabinet-bangoura.gn", null, false],
  ["Sékou Fofana", "Retour produit", "Je souhaite retourner l'imprimante achetée la semaine dernière, elle ne correspond pas à mes besoins.", "sekou.fofana@gmail.com", "+224 620 77 66 55", false],
  ["Banque Islamique de Guinée", "Renouvellement des licences", "Nos licences arrivent à échéance le 30 novembre. Merci de nous adresser la proposition de renouvellement.", "informatique@big.gn", null, false],
];

// UUID v4 déterministes : les identifiants restent stables d’un redémarrage à l’autre.
function seededUuid(n: number) {
  let s = (n + 1) * 0x9e3779b1;
  const hex = (len: number) => {
    let out = "";
    for (let i = 0; i < len; i++) {
      s = (s ^ (s << 13)) >>> 0;
      s = (s ^ (s >>> 17)) >>> 0;
      s = (s ^ (s << 5)) >>> 0;
      out += (s % 16).toString(16);
    }
    return out;
  };
  // Le dernier octet fixe la couleur d’avatar (octet % 6) : on retrouve celle du prototype.
  const tail = Math.min(246, Math.floor(parseInt(hex(2), 16) / 6) * 6) + (n % 6);
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${"89ab"[n % 4]}${hex(3)}-${hex(10)}${tail
    .toString(16)
    .padStart(2, "0")}`;
}

function buildSeed(): CustomerRequest[] {
  // Dates échelonnées comme dans le prototype, à partir du 21 oct. 2026 09:42 UTC
  let t = Date.parse("2026-10-21T09:42:00Z");
  return SEED.map(([customerName, subject, description, customerEmail, customerPhone, isPriority], i) => {
    t -= (i % 3 === 0 ? 3 : i % 3 === 1 ? 5.5 : 20) * 3600e3 + i * 61e3;
    const at = new Date(t);
    return {
      id: seededUuid(i),
      customerName,
      subject,
      description,
      customerEmail,
      customerPhone,
      isPriority,
      createdAt: at,
      updatedAt: at,
    };
  });
}

const g = globalThis as unknown as { __doztraStore?: CustomerRequest[] };

export function store(): CustomerRequest[] {
  g.__doztraStore ??= simulation === "empty" ? [] : buildSeed();
  return g.__doztraStore;
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
