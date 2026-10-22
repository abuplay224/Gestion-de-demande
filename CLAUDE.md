# CLAUDE.md — Doztra · Gestion des demandes clients (MVP)

Ce fichier est lu automatiquement au démarrage de chaque session. Il décrit le projet,
les commandes, les conventions et les garde-fous. Les détails métier, d'architecture,
d'interface et de sécurité sont dans les skills du dossier `.claude/skills/`.

---

## 1. Contexte

Application web interne permettant à l'équipe Doztra de **saisir**, **consulter** et
**prioriser** les demandes reçues des clients. Registre partagé, persistant, utilisable
sur ordinateur et téléphone. Interface **en français**, fuseau **Africa/Conakry**.

Trois fonctions, et rien de plus dans ce MVP :

1. Ajouter une demande (F01)
2. Afficher les demandes (F02)
3. Marquer / retirer la priorité (F03)

**Hors périmètre — ne pas implémenter sans validation explicite :** modification après
création, suppression, statuts de traitement, clôture, assignation, commentaires, pièces
jointes, notifications, intégrations e-mail/WhatsApp/Telegram, recherche avancée, exports,
temps réel, tableau de bord statistique, portail client.

Si une demande d'évolution sort de ce périmètre : le signaler avant d'écrire du code.

---

## 2. Stack

**Imposée par le client :**
- Next.js (App Router) — interface et logique serveur dans le même projet
- PostgreSQL — stockage persistant
- shadcn/ui — composants d'interface

**Choix complémentaires retenus :**
- TypeScript (`strict: true`)
- Tailwind CSS
- Prisma (accès données + migrations versionnées)
- Zod (schémas de validation partagés client/serveur)
- Vitest + Testing Library (unitaires/intégration), Playwright (bout en bout)

Pas de backend séparé, pas d'API REST publique. Versions stables au démarrage,
`package-lock.json` (ou équivalent) committé. Aucune version figée dans la documentation.

---

## 3. Commandes

Le dépôt utilise **npm** (`package-lock.json`).

```bash
npm install                  # installation (+ prisma generate)
npm run dev                  # serveur de développement
npm run build && npm start   # build de production
npm run lint                 # ESLint
npm run typecheck            # tsc --noEmit
npm test                     # Vitest : unitaires + intégration
npm run test:unit            # unitaires seuls
npm run test:integration     # intégration sur PostgreSQL (DATABASE_URL_TEST)
npx vitest run tests/unit/request.schema.test.ts -t "R03"   # un seul test
npm run test:e2e             # build + Playwright (Edge, base de test, port 3200)
npx playwright test -g "R09" # un seul parcours (après un build)
npm run db:migrate           # prisma migrate dev (base de dev)
npm run db:deploy            # prisma migrate deploy
npm run db:seed              # 26 demandes fictives du prototype (idempotent)
npm run db:test:deploy       # migrations sur la base de test
```

Avant toute proposition de livraison : `npm run lint && npm run typecheck && npm test && npm run test:e2e`.

Liens stylés en bouton : `<Link className={buttonVariants(...)}>`, jamais
`<Button render={<Link/>}>` (Base UI ajoute alors `role="button"` au lien).

**Base de données.** `.env` (non versionné, modèle `.env.example`) définit `DATABASE_URL`
(dev) et `DATABASE_URL_TEST` (test, vidée par les tests d'intégration ; son nom doit
contenir « test »). Prisma 7 : configuration dans `prisma.config.ts`, client généré dans
`generated/prisma` (non versionné), adaptateur `@prisma/adapter-pg`. Les CHECK de longueur
sont écrits à la main dans le SQL de migration. Prisma refuse `migrate reset` lancé par un
agent IA : ne pas le contourner, demander à l'utilisateur.

`lib/auth.ts` est encore un stub (mécanisme d'accès à décider). Le prototype de référence
est `docs/Doztra Demandes.dc.html`.

---

## 4. Arborescence cible

```
app/
  page.tsx                        # redirige vers /demandes
  demandes/
    page.tsx                      # liste (Server Component)
    nouvelle/page.tsx             # formulaire de création
  layout.tsx
components/
  demandes/                       # table, cartes, badge, panneau, pagination
  ui/                             # composants shadcn/ui intégrés
lib/
  db.ts                           # client Prisma (serveur uniquement)
  auth.ts                         # vérification du contexte utilisateur
  errors.ts                       # codes d'erreur structurés
  format.ts                       # dates fr-FR / Africa/Conakry
server/
  actions/
    create-request.ts
    set-request-priority.ts
  queries/
    list-requests.ts
  validation/
    request.schema.ts             # schémas Zod partagés
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
```

---

## 5. Règles non négociables

### Sécurité
- Toute lecture et toute écriture vérifient le contexte utilisateur **dans la fonction
  serveur**, jamais seulement dans l'interface. Une Server Action est un point d'entrée
  public : la traiter comme tel.
- Aucune donnée client accessible anonymement. Pas d'inscription publique.
- Le client Prisma n'est jamais importé depuis un Client Component. `lib/db.ts` commence
  par `import 'server-only'`.
- Requêtes paramétrées uniquement. Aucune concaténation SQL à partir d'une saisie.
- Descriptions et coordonnées affichées comme **texte** ; jamais de
  `dangerouslySetInnerHTML` sur du contenu saisi.
- Secrets en variables d'environnement, jamais dans le dépôt. `.env.example` sans valeurs.
- Les descriptions et coordonnées ne sont **pas journalisées en clair**. Les messages
  d'erreur techniques restent dans les journaux serveur ; l'utilisateur voit un message
  exploitable et générique.
- HTTPS en déploiement.

### Fiabilité
- Une seule écriture atomique par création et par changement de priorité.
- Jamais de fausse confirmation de sauvegarde : le message de succès n'apparaît qu'après
  confirmation de la base.
- Idempotence de la création par UUID de soumission (voir skill règles métier).
- `setRequestPriority` reçoit un **booléen strict**, jamais une instruction d'inversion.

### Qualité
- Validation Zod partagée : le même schéma sert à l'aide à la saisie et au contrôle
  serveur. Le serveur ne fait jamais confiance au client.
- Les limites de longueur s'appliquent **après `trim()`**. Les coordonnées vides sont
  stockées `NULL`.
- Erreurs structurées : `VALIDATION_ERROR`, `UNAUTHORIZED`, `NOT_FOUND`, `CONFLICT`,
  `INTERNAL_ERROR`.
- Après écriture réussie : invalider `/demandes` et rafraîchir les données.
- Accessibilité : navigation clavier, focus visible, libellés associés, erreurs liées aux
  champs via `aria-describedby`, retour du focus à la fermeture du panneau, priorité
  signalée par texte **et** symbole (jamais la couleur seule).

---

## 6. Skills du projet

| Skill | À charger quand |
|---|---|
| `doztra-demandes-business-rules` | Toute logique métier : validation, tri, pagination, priorité, idempotence |
| `doztra-demandes-nextjs` | Server Actions, Prisma, schéma PostgreSQL, contrats applicatifs, invalidation |
| `doztra-demandes-ui` | Écrans, composants shadcn/ui, tokens de design, états, responsive, accessibilité |
| `doztra-demandes-securite-recette` | Contrôle d'accès, durcissement, tests et critères d'acceptation R01–R19 |

---

## 7. Conventions de code

- Français pour l'interface, les libellés, les messages d'erreur et les commentaires
  métier. Anglais pour les identifiants de code (`customerName`, `isPriority`).
- Server Components par défaut ; `'use client'` uniquement là où une interaction l'exige
  (formulaire, panneau de détail, bouton de priorité).
- Un composant = un fichier. Pas de composant de plus de ~200 lignes.
- Les types de données viennent de Prisma et des schémas Zod ; pas de type dupliqué à la
  main.
- Pas de `any`, pas de `@ts-ignore` sans commentaire justifiant la dérogation.
- Messages de commit en français, impératif : `feat: ajouter le panneau de détail`.

---

## 8. Décisions encore ouvertes

Ne pas trancher seul ; demander avant d'implémenter :

- Mécanisme de protection d'accès (fournisseur d'identité ou passerelle)
- Hébergement et budget
- Logo et couleur officielle de la charte Doztra (le prototype propose `#7B5CF5`)
- Durée de conservation des données
- Modification / suppression des demandes (reportées)

---

## 9. Définition du « terminé »

Une fonctionnalité est livrée quand :

1. `lint`, `typecheck` et `test` passent ;
2. les scénarios de recette correspondants (R01–R19) sont vérifiés ;
3. les états vide / chargement / erreur sont traités ;
4. le parcours a été vérifié au clavier et sur une largeur mobile ;
5. la documentation (README, guide utilisateur) reflète le changement.
