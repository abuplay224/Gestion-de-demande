---
name: doztra-demandes-api-mobile
description: Utiliser pour exposer et sécuriser l'API HTTP que l'app mobile Doztra Demandes consomme — Route Handlers Next.js, authentification par jeton, contrats JSON des trois opérations, idempotence, codes d'erreur, limitation de débit, versionnage.
---

# Doztra Demandes — API pour l'app mobile

Ce skill couvre le **côté serveur** de la version mobile. Les règles de gestion restent
celles de `doztra-demandes-business-rules` (RG1–RG20) : l'API ne les réécrit pas, elle
les expose. L'app elle-même est traitée par `doztra-demandes-mobile-data` et
`doztra-demandes-mobile-ui`.

---

## 1. Décision d'architecture à faire valider

Le cahier des charges MVP écrit : « Pas de backend séparé **ni d'API REST publique** pour
ce MVP ». Une application React Native ne peut pas appeler des Server Actions : elle a
besoin d'endpoints HTTP.

**Conséquence : ajouter une API est un élargissement du périmètre, pas un détail
d'implémentation.** Avant d'écrire du code, faire acter par Doztra :

1. l'ouverture d'une API HTTP authentifiée (non publique : réservée aux collaborateurs) ;
2. le mécanisme d'authentification mobile, qui découle du mécanisme d'accès web encore
   ouvert ;
3. l'hébergement, qui doit désormais être joignable depuis l'extérieur en HTTPS.

Principe directeur : **une seule source de vérité métier**. Les Route Handlers appellent
exactement les mêmes fonctions serveur que le web (`listRequests`, `createRequest`,
`setRequestPriority`). Aucune règle n'est réimplémentée pour le mobile — une règle
dupliquée est une règle qui divergera.

```
server/
  queries/list-requests.ts        ← partagé
  actions/create-request.ts       ← partagé (logique extraite en service pur)
  actions/set-request-priority.ts ← partagé
  services/requests.ts            ← logique métier, sans dépendance Next
app/
  (web)/…                         ← Server Components + Server Actions
  api/v1/requests/route.ts        ← GET liste, POST création
  api/v1/requests/[id]/priority/route.ts  ← PATCH priorité
  api/v1/auth/…                   ← selon le mécanisme retenu
  api/v1/health/route.ts
```

Extraire la logique dans `server/services/requests.ts` (fonctions pures prenant un
contexte utilisateur) ; Server Actions et Route Handlers n'en sont que deux adaptateurs.

---

## 2. Authentification

Le mécanisme reste à confirmer avec Doztra. Quelle que soit l'option retenue :

- **Aucune inscription publique.** Les comptes sont provisionnés par Doztra.
- Jeton d'accès **court** (15–30 min) + jeton de rafraîchissement **à usage unique**
  (rotation : un rafraîchissement invalide le précédent).
- Le jeton d'accès voyage en `Authorization: Bearer <jeton>`, jamais en paramètre d'URL
  (les URL finissent dans les journaux et l'historique).
- Révocation possible côté serveur : une liste de jetons de rafraîchissement actifs par
  appareil, avec date de dernier usage.
- Toute route `/api/v1/*` sauf `health` exige un utilisateur authentifié, vérifié **dans
  le handler**, pas seulement dans un middleware.

```ts
// lib/api-auth.ts
import 'server-only';

export async function requireApiUser(req: Request): Promise<SessionUser> {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'UNAUTHORIZED', 'Authentification requise.');

  const user = await verifyAccessToken(token);   // adaptateur du mécanisme retenu
  if (!user) throw new ApiError(401, 'UNAUTHORIZED', 'Session expirée.');
  return user;
}
```

Un jeton expiré renvoie **401** (l'app tente un rafraîchissement) ; un jeton valide mais
sans droit renvoie **403** (l'app déconnecte). Ne jamais confondre les deux : l'app ne
saurait pas s'il faut rafraîchir ou déconnecter.

---

## 3. Contrats

Toutes les réponses sont du JSON en UTF-8. Les dates sont en **ISO 8601 UTC**
(`2026-10-21T09:42:00.000Z`) ; le formatage dans le fuseau `Africa/Conakry` est le travail
du client.

### Enveloppe

```jsonc
// succès
{ "data": { … } }

// erreur
{ "error": { "code": "VALIDATION_ERROR", "message": "Vérifiez les champs signalés.",
             "fields": { "customerName": "Le nom doit contenir au moins 2 caractères." } } }
```

`code` fait partie du contrat et pilote le comportement de l'app ; `message` est destiné
à l'utilisateur, en français. Aucun détail technique, aucune trace de pile, aucun nom de
table dans la réponse.

### `GET /api/v1/requests?page=1`

```jsonc
{ "data": {
    "items": [{
      "id": "…", "customerName": "Hôtel Kaloum", "subject": "Coupure du service",
      "description": "…", "customerEmail": null, "customerPhone": "+224 657 33 90 01",
      "isPriority": true,
      "createdAt": "2026-10-20T07:12:00.000Z", "updatedAt": "2026-10-20T07:12:00.000Z"
    }],
    "total": 26, "page": 1, "pageSize": 20, "pages": 2 } }
```

Tri RG12 et pagination RG13 appliqués en base. `page` hors bornes → dernière page valide
(RG14), sans redirection HTTP : l'API renvoie la page corrigée et le champ `page` indique
laquelle, pour que l'app se recale.

### `POST /api/v1/requests`

Corps : `submissionId` (UUID) + `customerName`, `subject`, `description`,
`customerEmail`, `customerPhone`.

| Situation | Statut | Code |
|---|---|---|
| Créée | `201` | — |
| Même `submissionId`, même contenu (RG7) | `200` | — (la demande existante est renvoyée) |
| Même `submissionId`, contenu différent (RG7) | `409` | `CONFLICT` |
| Validation | `422` | `VALIDATION_ERROR` + `fields` |
| Panne base | `503` | `INTERNAL_ERROR` |

L'UUID de soumission est **généré par l'app** (`expo-crypto`) avant le premier envoi et
réutilisé à l'identique à chaque nouvelle tentative : c'est ce qui rend un réessai sur
réseau instable sans danger. Côté serveur, aucune confiance n'est accordée à cet UUID
au-delà de son rôle de clé d'idempotence : il reste validé comme UUID et ne détermine
aucun droit.

### `PATCH /api/v1/requests/{id}/priority`

Corps : `{ "isPriority": true }` — **booléen strict** (RG18), jamais un toggle.
Réponse `200` : `{ "data": { "id", "isPriority", "updatedAt" } }`.
`404` + `NOT_FOUND` si l'identifiant est inconnu (R14). Une écriture vers la valeur déjà
en place réussit et laisse `updatedAt` inchangé (RG19).

### Correspondance des statuts

| Code | Statut HTTP |
|---|---|
| `VALIDATION_ERROR` | 422 |
| `UNAUTHORIZED` | 401 (jeton absent/expiré) · 403 (sans droit) |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `INTERNAL_ERROR` | 500 · 503 si indisponibilité temporaire |

---

## 4. Durcissement spécifique à l'API

- **HTTPS obligatoire.** Pas de dérogation en développement sur un appareil réel : utiliser
  un tunnel, pas du HTTP en clair sur le réseau local.
- **Limitation de débit** par utilisateur et par IP : l'authentification est la cible la
  plus exposée. Prévoir un plafond strict sur les routes d'authentification et un plafond
  plus large sur les lectures.
- **Pas de CORS permissif.** Une app native n'envoie pas d'origine : `Access-Control-Allow-Origin: *`
  n'apporte rien au mobile et ouvre l'API aux navigateurs. Laisser CORS fermé.
- **Taille de corps plafonnée** (par exemple 64 Ko) : la description fait 5 000 caractères
  au maximum, rien ne justifie davantage.
- **Journalisation** : méthode, route, statut, identifiant d'utilisateur, durée. Jamais la
  description, l'e-mail ni le téléphone (contrainte du cahier des charges, section 8).
- **Validation Zod** de tout corps entrant avant le moindre accès base, comme sur le web.
- Réponses **non mises en cache** : `Cache-Control: no-store` sur les routes de données.
- Après écriture, `revalidatePath('/demandes')` reste nécessaire pour que le **web** voie
  le changement fait depuis le mobile.

---

## 5. Versionnage et compatibilité

Une app mobile installée ne se met pas à jour en même temps que le serveur : des versions
anciennes resteront en circulation.

- Préfixe `/api/v1/` dès le premier jour.
- Évolutions **additives** uniquement dans `v1` : ajouter un champ est permis, en
  supprimer ou en changer le sens ne l'est pas.
- En-tête `X-App-Version` envoyé par l'app ; prévoir une réponse `426` lorsqu'une version
  minimale devient obligatoire, pour que l'app affiche un écran de mise à jour plutôt
  qu'une erreur incompréhensible.
- `GET /api/v1/health` sans authentification, renvoyant uniquement un état et la version
  du serveur — aucune information d'infrastructure.

---

## 6. Tests

- Un test d'intégration **par ligne du tableau des statuts** ci-dessus.
- R15 version mobile : appel de chaque route **sans jeton**, **avec un jeton expiré** et
  **avec un jeton forgé** → aucune lecture ni écriture.
- R05/R18 version mobile : deux `POST` concurrents avec le même `submissionId` → une seule
  ligne ; même `submissionId` avec un contenu modifié → `409`.
- R19 version mobile : description contenant des balises et une tentative d'injection →
  stockée et renvoyée telle quelle, aucune exécution, aucune erreur base.
- Vérifier qu'aucune réponse d'erreur ne contient de message d'exception brut.

---

## 7. Avant de valider une modification

- [ ] L'élargissement de périmètre (API) est acté par Doztra
- [ ] Aucune règle métier dupliquée entre Server Action et Route Handler
- [ ] `requireApiUser()` en première ligne de chaque handler protégé
- [ ] 401 et 403 distingués
- [ ] Corps validé par Zod avant tout accès base
- [ ] `submissionId` honoré pour l'idempotence
- [ ] `isPriority` reçu en booléen strict
- [ ] Aucune donnée personnelle dans les journaux ni dans les messages d'erreur
- [ ] `Cache-Control: no-store`, CORS fermé, débit limité
- [ ] Route préfixée `/api/v1/`
