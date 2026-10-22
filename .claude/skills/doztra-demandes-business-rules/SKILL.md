---
name: doztra-demandes-business-rules
description: Utiliser pour implémenter, tester ou relire toute logique métier de Doztra Demandes — validation des champs, création idempotente par UUID, tri, pagination, bascule de priorité, codes d'erreur, états de liste. Checklist RG1 à RG20.
---

# Doztra Demandes — Règles de gestion

Source : cahier des charges v1.0 du 21 octobre 2026, sections 4, 6 et 7.
Référence unique pour le **comportement** attendu. L'apparence est traitée par
`doztra-demandes-ui`, l'infrastructure par `doztra-demandes-nextjs`, le contrôle d'accès
et la recette par `doztra-demandes-securite-recette`.

---

## 1. Modèle métier

Une **demande** (`customer_requests`) est immuable après création dans ce MVP, à
l'exception du champ `is_priority`.

| Champ | Type | Obligatoire | Règle |
|---|---|---|---|
| `id` | UUID | oui | Généré **côté serveur** et remis au formulaire avant la soumission |
| `customer_name` | string(150) | oui | 2 à 150 caractères après `trim()` |
| `subject` | string(200) | oui | 3 à 200 caractères après `trim()` |
| `description` | text | oui | 10 à 5 000 caractères après `trim()` |
| `customer_email` | string(254) | non | Format e-mail valide, 254 max ; vide → `NULL` |
| `customer_phone` | string(30) | non | Texte libre, 30 max ; vide → `NULL` |
| `is_priority` | boolean | oui | `false` à la création |
| `created_at` | timestamptz | oui | Valeur **serveur** |
| `updated_at` | timestamptz | oui | Valeur serveur, mise à jour **uniquement sur modification réelle** |

---

## 2. Checklist des règles

### Création — F01

- **RG1** — Les limites de longueur portent sur la valeur **après suppression des espaces
  de début et de fin**. Une valeur obligatoire composée uniquement d'espaces est refusée.
- **RG2** — Les coordonnées vides (chaîne vide ou espaces seuls) sont enregistrées `NULL`,
  jamais `''`.
- **RG3** — Le téléphone est du **texte** : conserver le `+`, les zéros initiaux et les
  espaces internes tels quels. Ne jamais normaliser ni convertir en nombre.
- **RG4** — Aucune contrainte d'unicité sur le nom ou les coordonnées. Deux demandes
  métier distinctes peuvent avoir exactement le même contenu.
- **RG5** — À la création, le serveur attribue `id`, `created_at`, `updated_at` et
  `is_priority = false`. Ces valeurs ne sont **jamais** acceptées depuis le client.
- **RG6** — Validation **serveur obligatoire**, avec le même schéma que l'aide à la saisie.
  Le client ne fait que pré-valider ; le serveur ne lui fait jamais confiance.
- **RG7 — Idempotence.** Le formulaire reçoit un UUID de soumission généré côté serveur à
  son ouverture.
  - Même UUID + même contenu → retourner la demande **existante**, ne rien créer.
  - Même UUID + contenu différent → `CONFLICT`, inviter à recharger la liste, ne rien
    écraser.
  - Nouveau formulaire → nouvel UUID.
- **RG8** — Pendant l'envoi : bouton désactivé, libellé « Enregistrement… ».
- **RG9** — Succès : message « Demande enregistrée », retour à la liste, page 1.
- **RG10** — Échec : la saisie est **conservée intégralement**, une explication
  exploitable est affichée, aucune confirmation de sauvegarde n'est montrée.
- **RG11** — « Annuler » revient à la liste sans rien enregistrer.

### Affichage — F02

- **RG12 — Tri.** `ORDER BY is_priority DESC, created_at DESC, id DESC`. Prioritaires
  d'abord, puis les plus récentes, puis identifiant décroissant pour un ordre
  déterministe en cas d'égalité de date.
- **RG13 — Pagination serveur** de 20 éléments, précédent/suivant. Le tri est appliqué
  **avant** la pagination, jamais sur la page seule.
- **RG14** — Page demandée supérieure au nombre de pages → rediriger vers la dernière page
  valide. Liste vide → page 1. Paramètre non entier ou ≤ 0 → page 1.
- **RG15** — Trois états explicites, mutuellement exclusifs : vide, chargement, erreur.
- **RG16** — Les textes longs ne cassent jamais la mise en page : troncature dans la
  liste (valeur complète en `title`), texte intégral dans le panneau de détail.
- **RG17** — Les changements d'un autre utilisateur deviennent visibles à l'actualisation.
  Aucun temps réel.

### Priorité — F03

- **RG18 — Valeur explicite.** `setRequestPriority(id, isPriority: boolean)`. Le serveur
  reçoit la valeur souhaitée, jamais une instruction d'inversion. Deux appels avec la même
  valeur donnent le même résultat (opération idempotente).
- **RG19** — `updated_at` n'est modifié que si la valeur **change réellement**. Une
  écriture vers la valeur déjà en place laisse `updated_at` inchangé.
- **RG20** — Échec : l'interface conserve l'**état confirmé précédemment** et affiche une
  erreur. Aucune mise à jour optimiste n'est conservée après échec. Le bouton concerné est
  désactivé pendant l'envoi.
- Concurrence : si deux utilisateurs écrivent en même temps, la dernière écriture
  confirmée par la base fait foi. Compromis accepté pour le MVP.
- La priorité n'entraîne **aucune** notification ni échéance automatique.

---

## 3. Contrats applicatifs

| Opération | Entrée | Sortie |
|---|---|---|
| `listRequests` | `page: number` (entier positif) | `{ items, total, page, pageSize }` |
| `createRequest` | `submissionId: UUID` + champs du formulaire | demande créée, ou erreurs de validation par champ |
| `setRequestPriority` | `id: UUID`, `isPriority: boolean` strict | `{ id, isPriority, updatedAt }` |

### Codes d'erreur

`VALIDATION_ERROR` · `UNAUTHORIZED` · `NOT_FOUND` · `CONFLICT` · `INTERNAL_ERROR`

Le détail technique reste côté serveur (journaux). Le client reçoit le code et, pour
`VALIDATION_ERROR`, la liste des champs fautifs avec leur message.

---

## 4. Messages (français, repris du prototype)

| Champ | Condition | Message |
|---|---|---|
| Nom | vide | `Indiquez le nom du client ou de l’entreprise.` |
| Nom | < 2 | `Le nom doit contenir au moins 2 caractères.` |
| Nom | > 150 | `150 caractères maximum (actuellement {n}).` |
| E-mail | format invalide | `Adresse e-mail invalide. Exemple : nom@entreprise.com` |
| E-mail | > 254 | `254 caractères maximum.` |
| Téléphone | > 30 | `30 caractères maximum (actuellement {n}).` |
| Objet | vide | `Indiquez l’objet de la demande.` |
| Objet | < 3 | `L’objet doit contenir au moins 3 caractères.` |
| Objet | > 200 | `200 caractères maximum (actuellement {n}).` |
| Description | vide | `Décrivez la demande du client.` |
| Description | < 10 | `La description doit contenir au moins 10 caractères.` |
| Description | > 5 000 | `5 000 caractères maximum (actuellement {n}).` |

Messages généraux :

- Succès création : `Demande enregistrée`
- Succès priorité : `Demande marquée comme prioritaire` / `Priorité retirée`
- Échec priorité : `Impossible de modifier la priorité. L’état précédent est conservé.`
- Échec création (bandeau) : titre `L’enregistrement a échoué` + cause exploitable, par
  exemple `La base de données est momentanément indisponible. Votre saisie est conservée : vous pouvez réessayer sans risque de doublon.`
- Conflit (RG7) : `Cette demande a déjà été enregistrée avec un contenu différent. Rechargez la liste avant de réessayer.`
- Erreur de liste : `Impossible de charger les demandes` + `Vérifiez votre connexion puis réessayez.`
- État vide : `Aucune demande pour le moment` + `Les demandes saisies par l’équipe apparaîtront ici.`

Utiliser l'apostrophe typographique `’` dans l'interface, pas l'apostrophe droite.

---

## 5. Schéma de validation de référence

```ts
// server/validation/request.schema.ts
import { z } from 'zod';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const requis = (min: number, max: number, m: { vide: string; court: string; long: (n: number) => string }) =>
  z.string()
    .transform((v) => v.trim())                       // RG1
    .superRefine((v, ctx) => {
      if (!v) ctx.addIssue({ code: 'custom', message: m.vide });
      else if (v.length < min) ctx.addIssue({ code: 'custom', message: m.court });
      else if (v.length > max) ctx.addIssue({ code: 'custom', message: m.long(v.length) });
    });

const facultatif = z.string()
  .transform((v) => { const t = v.trim(); return t === '' ? null : t; })  // RG2
  .nullable();

export const createRequestSchema = z.object({
  submissionId: z.string().uuid(),                                        // RG7
  customerName: requis(2, 150, { /* messages §4 */ }),
  subject:      requis(3, 200, { /* messages §4 */ }),
  description:  requis(10, 5000, { /* messages §4 */ }),
  customerEmail: facultatif.superRefine((v, ctx) => {
    if (v === null) return;
    if (v.length > 254) ctx.addIssue({ code: 'custom', message: '254 caractères maximum.' });
    else if (!EMAIL.test(v)) ctx.addIssue({ code: 'custom', message: 'Adresse e-mail invalide. Exemple : nom@entreprise.com' });
  }),
  customerPhone: facultatif.superRefine((v, ctx) => {                     // RG3 : aucune normalisation
    if (v !== null && v.length > 30) ctx.addIssue({ code: 'custom', message: `30 caractères maximum (actuellement ${v.length}).` });
  }),
});

export const setPrioritySchema = z.object({
  id: z.string().uuid(),
  isPriority: z.boolean(),                                                // RG18 — booléen strict
});

export const pageSchema = z.coerce.number().int().positive().catch(1);    // RG14
```

`is_priority`, `created_at`, `updated_at` et l'identifiant de ligne ne figurent jamais dans
le schéma d'entrée de création (RG5).

---

## 6. Pièges connus

- Valider **avant** `trim()` : fait passer `"  "` pour une valeur de 2 caractères. Toujours
  `trim()` puis mesurer.
- Trier en mémoire après pagination : casse l'ordre global (RG13). Le tri est en SQL.
- Implémenter la priorité comme `NOT is_priority` : viole RG18 et provoque des inversions
  sur double clic.
- Mettre `updated_at = now()` à chaque écriture : viole RG19.
- Utiliser `upsert` sans comparer le contenu : masque le conflit attendu par RG7.
- Afficher le message de succès avant la réponse de la base : viole RG10 et le principe
  « jamais de fausse confirmation ».
- Normaliser le téléphone (suppression des espaces, du `+`, du zéro initial) : viole RG3.
  La version sans espaces sert uniquement au lien `tel:`, jamais au stockage.

---

## 7. Avant de valider une modification

- [ ] Bornes appliquées après `trim()`
- [ ] Coordonnées vides stockées `NULL`
- [ ] Téléphone conservé tel quel
- [ ] Tri à trois clés exécuté en base
- [ ] Pagination serveur de 20, tri avant découpage
- [ ] `setRequestPriority` prend un booléen, pas un toggle
- [ ] `updated_at` ne bouge que sur changement réel
- [ ] Idempotence par `submissionId` couverte par un test
- [ ] Chemin d'échec : saisie conservée, état précédent conservé, aucun faux succès
- [ ] Aucune règle hors périmètre ajoutée au passage
