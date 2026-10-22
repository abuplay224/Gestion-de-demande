---
name: doztra-demandes-securite-recette
description: Utiliser pour mettre en place ou relire le contrôle d'accès, le durcissement et les tests de Doztra Demandes — protection des routes et Server Actions, journalisation sans données personnelles, exploitation, et les 19 scénarios de recette R01 à R19 avec leur stratégie de test.
---

# Doztra Demandes — Sécurité, exploitation et recette

Source : cahier des charges, sections 8 et 9. À lire avant toute mise en place du
contrôle d'accès et avant de déclarer une fonctionnalité terminée.

---

## 1. Contrôle d'accès

Le mécanisme (fournisseur d'identité ou passerelle) **reste à confirmer avec Doztra**.
Ne pas le choisir seul. En attendant, le code est écrit derrière une frontière unique :

```ts
// lib/auth.ts
import 'server-only';
import { AppError } from './errors';

export type SessionUser = { id: string; email: string };

/** Unique point de vérification. L'implémentation change avec le mécanisme retenu ;
 *  les appelants, non. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();          // adaptateur du fournisseur retenu
  if (!user) throw new AppError('UNAUTHORIZED', 'Accès réservé aux collaborateurs autorisés.');
  return user;
}
```

Règles :

- **Chaque** Server Action et **chaque** requête de lecture commence par `requireUser()`.
  Une Server Action est un point d'entrée réseau public : un `middleware` qui protège les
  pages ne la protège pas (R15).
- Le middleware protège en plus **toutes** les routes, y compris `/` et les ressources
  statiques sensibles. Défense en profondeur, pas substitut.
- Aucune inscription publique. Les comptes sont provisionnés par Doztra.
- Tous les utilisateurs autorisés ont les mêmes droits dans ce MVP : pas de rôle à
  inventer. Si un besoin de rôles apparaît, le signaler, ne pas l'improviser.
- Aucune donnée client accessible anonymement, y compris via un appel direct à une
  Server Action ou une recherche d'identifiant.

---

## 2. Durcissement

| Risque | Mesure |
|---|---|
| Injection SQL | Prisma uniquement, requêtes paramétrées. Si `$queryRaw` devient nécessaire : `Prisma.sql` avec interpolation paramétrée, jamais de concaténation (R19) |
| XSS stocké | Rendu en texte par React. Aucun `dangerouslySetInnerHTML` sur une valeur saisie (R19) |
| Fuite de secrets | Variables d'environnement, `.env` hors dépôt, `.env.example` sans valeurs, aucun secret dans le code ni dans une variable `NEXT_PUBLIC_*` |
| Fuite par les journaux | Ne jamais journaliser description, e-mail ou téléphone. Journaliser un identifiant d'opération et un code, pas la charge utile |
| Fuite d'erreur technique | Message utilisateur générique mais exploitable ; détail et pile uniquement côté serveur |
| Transport | HTTPS obligatoire en déploiement, cookies de session `HttpOnly`, `Secure`, `SameSite=Lax` |
| Connexion base exposée | `import 'server-only'` dans `lib/db.ts` ; aucune URL de base dans le bundle client |
| Faux succès | Le message de confirmation n'est émis qu'après réponse confirmée de la base |

En-têtes de réponse recommandés (`next.config`) : `Content-Security-Policy` restrictive,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`X-Frame-Options: DENY`.

---

## 3. Exploitation

- Base de **développement distincte** de la production ; uniquement des données fictives
  hors production.
- Migrations versionnées et committées ; `prisma migrate deploy` en déploiement.
- Sauvegarde quotidienne proposée, **procédure de restauration documentée et testée** —
  une sauvegarde jamais restaurée n'est pas une sauvegarde.
- Durée de conservation des données : à définir avec Doztra avant exploitation réelle.
- Cible de performance à vérifier en recette : sur 1 000 demandes fictives et
  5 utilisateurs simultanés, 95 % des chargements de liste et des mutations sous 2 s,
  hors démarrage à froid, sur connexion stable. C'est un objectif à **mesurer** dans
  l'environnement retenu, pas une garantie à annoncer.
- Environnement de démonstration protégé par le même contrôle d'accès que la production.

---

## 4. Recette — R01 à R19

| ID | Scénario | Attendu | Niveau de test |
|---|---|---|---|
| R01 | Saisie valide sans coordonnées | Demande créée, priorité normale, date automatique | intégration |
| R02 | Champ obligatoire vide ou hors limites | Refus, erreur au bon champ, aucune ligne créée | unitaire + intégration |
| R03 | E-mail renseigné mais invalide | Refus avec message compréhensible | unitaire |
| R04 | Téléphone avec `+` et zéro initial | Valeurs conservées à l'identique | intégration |
| R05 | Double clic ou renvoi identique | Une seule demande pour le même UUID | intégration + e2e |
| R06 | Actualisation et redémarrage | Demandes conservées en PostgreSQL | e2e |
| R07 | Aucune demande | État vide et bouton d'ajout visibles | composant + e2e |
| R08 | Plus de 20 demandes | Pagination et ordre global corrects | intégration + e2e |
| R09 | Marquage prioritaire | Badge, tri et valeur persistée mis à jour | intégration + e2e |
| R10 | Retrait de priorité | Retour au groupe normal, ordre chronologique respecté | intégration |
| R11 | Même valeur envoyée deux fois | État stable, aucune inversion, `updated_at` inchangé | intégration |
| R12 | Base indisponible à la création | Erreur, saisie conservée, aucun faux succès | intégration (base simulée en échec) |
| R13 | Échec du changement de priorité | Ancien état conservé, nouvelle tentative possible | composant + intégration |
| R14 | Identifiant absent ou invalide | Erreur contrôlée, aucune autre ligne modifiée | intégration |
| R15 | Visiteur non autorisé, y compris appel serveur direct | Aucune lecture ni écriture | intégration + e2e |
| R16 | Navigation mobile et clavier | Tout accessible, rien d'essentiel masqué | manuel + e2e |
| R17 | Modification depuis une autre session puis actualisation | Dernier état confirmé visible | e2e |
| R18 | Même UUID, contenu différent | Conflit explicite, aucun écrasement | intégration |
| R19 | Texte avec balises ou tentative SQL | Texte inoffensif ou refus, aucune exécution | intégration |

### Organisation des tests

```
tests/
  unit/          validation Zod, formatage des dates, règles pures  → R02, R03
  integration/   actions et requêtes sur PostgreSQL de test         → R01, R04–R05, R08–R15, R18–R19
  e2e/           création → liste → priorité → actualisation        → R05–R09, R15–R17
```

- L'intégration tourne sur une **base PostgreSQL de test réelle** (conteneur jetable),
  pas sur un double en mémoire : les CHECK, l'index et le tri font partie du
  comportement testé.
- Chaque test d'intégration repart d'un schéma migré et d'un jeu de données maîtrisé.
- R12 et R13 se testent en faisant échouer la couche base (mock du client Prisma ou
  rupture de connexion), puis en vérifiant la **conservation de l'état et de la saisie**.
- R15 se teste en appelant l'action **sans session**, pas seulement en masquant un bouton.
- R16 : vérification manuelle à ~375 px de large et parcours complet au clavier
  (tabulation, `Entrée`, `Échap`), plus un test e2e de navigation au clavier.

### Cas limites à couvrir explicitement

- Valeur composée uniquement d'espaces dans un champ obligatoire.
- Nom à exactement 2 et 150 caractères ; description à 10 et 5 000.
- E-mail à 254 caractères.
- Caractères accentués et apostrophes typographiques dans tous les champs.
- Objet et description sans espace, très longs (mise en page).
- `?page=0`, `?page=abc`, `?page=9999` sur la liste.
- Deux envois simultanés du même `submissionId`.

---

## 5. Avant de déclarer terminé

- [ ] `requireUser()` présent dans toutes les actions et requêtes, testé sans session
- [ ] Aucun secret, aucune donnée réelle dans le dépôt
- [ ] Journaux exempts de description et de coordonnées
- [ ] Migrations et CHECK appliqués sur la base de test
- [ ] Scénarios R01–R19 couverts ou explicitement listés comme non couverts
- [ ] `lint`, `typecheck`, `test`, `test:e2e` au vert
- [ ] Parcours vérifié au clavier et en largeur mobile
- [ ] README, `.env.example` et guide utilisateur à jour
- [ ] Compte rendu de recette rédigé, mesures de performance consignées
