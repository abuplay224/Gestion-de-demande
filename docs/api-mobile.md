# API mobile Doztra Demandes — guide d’intégration (v1)

Ce guide s’adresse au développeur de l’application React Native. Le contrat complet (schémas,
exemples, codes) est dans [api/openapi.yaml](api/openapi.yaml) : importez-le dans Postman ou
Insomnia, ou générez les types TypeScript avec
`npx openapi-typescript docs/api/openapi.yaml -o src/api/schema.d.ts`.

L’app reprend les trois fonctions du site web : **consulter**, **ajouter** et **prioriser**
les demandes. La gestion des comptes (création, rôles, désactivation) reste sur le site web.

---

## 1. Généralités

| | |
|---|---|
| URL de base | `https://<domaine-de-production>/api/v1` (domaine Vercel stable, jamais une adresse de déploiement `…-xxxxxxxx-….vercel.app`) |
| Format | JSON UTF-8, en-tête `Content-Type: application/json` sur les corps |
| Dates | ISO 8601 UTC (`2026-10-21T09:42:00.000Z`), à afficher dans le fuseau **Africa/Conakry** |
| Authentification | `Authorization: Bearer <accessToken>` — jamais de jeton dans l’URL |
| Version de l’app | En-tête `X-App-Version: 1.0.0` sur chaque requête |
| Taille de corps | 64 Ko maximum (413 au-delà) |
| Cache | Aucune réponse n’est mise en cache (`Cache-Control: no-store`) |
| CORS | Fermé : l’API est faite pour une app native, pas pour un navigateur |

En développement sur un appareil réel, exposez le serveur local par un **tunnel HTTPS** (par
exemple `ngrok http 3000`) plutôt qu’en HTTP sur le réseau local.

### Enveloppe des réponses

```jsonc
// Succès
{ "data": { … } }

// Erreur
{ "error": { "code": "VALIDATION_ERROR", "message": "Vérifiez les champs signalés.",
             "fields": { "customerName": "Le nom doit contenir au moins 2 caractères." } } }
```

`code` pilote le comportement de l’app. `message` est en français et **s’affiche tel quel**.
`fields` n’existe que pour `VALIDATION_ERROR` : un message par champ, avec les mêmes noms que
dans le corps envoyé.

### Statuts et réaction attendue de l’app

| Statut | `code` | Signification | Réaction de l’app |
|---|---|---|---|
| 200 / 201 / 204 | — | Succès | — |
| 401 | `UNAUTHORIZED` | Jeton absent, expiré ou révoqué | Rafraîchir **une fois** puis rejouer la requête ; si le rafraîchissement échoue, écran de connexion |
| 403 | `UNAUTHORIZED` | Compte désactivé par un administrateur | Effacer les jetons, écran de connexion avec le message |
| 404 | `NOT_FOUND` | Demande introuvable | Message, retour à la liste |
| 409 | `CONFLICT` | `submissionId` déjà utilisé pour un autre contenu | Message, recharger la liste |
| 413 | `PAYLOAD_TOO_LARGE` | Corps > 64 Ko | Ne doit pas arriver si les limites sont respectées |
| 422 | `VALIDATION_ERROR` | Données invalides | Afficher `fields` sous chaque champ |
| 426 | `UPGRADE_REQUIRED` | Version de l’app trop ancienne | Écran « Mise à jour requise » (version minimale dans `X-Min-App-Version`) |
| 429 | `RATE_LIMITED` | Trop de requêtes | Attendre `Retry-After` secondes |
| 500 / 503 | `INTERNAL_ERROR` | Erreur serveur ou base indisponible | Message, proposer de réessayer **avec les mêmes données** |

---

## 2. Authentification

Il n’y a **pas d’inscription** : un administrateur crée le compte sur le site web et transmet
un mot de passe provisoire.

### Les jetons

| Jeton | Préfixe | Durée | Usage |
|---|---|---|---|
| Accès | `dza_` | 15 minutes | En-tête `Authorization: Bearer …` sur chaque requête |
| Rafraîchissement | `dzr_` | 30 jours, renouvelés à chaque rafraîchissement | **Usage unique** : sert à obtenir une nouvelle paire |

Stockez les deux jetons dans **`expo-secure-store`** (jamais AsyncStorage, jamais en clair dans
les journaux). Chaque appareil a sa propre session : se déconnecter d’un téléphone ne
déconnecte pas les autres.

### Connexion — `POST /auth/login`

```http
POST /api/v1/auth/login
Content-Type: application/json
X-App-Version: 1.0.0

{ "email": "binta.camara@doztra.com", "password": "…", "deviceName": "iPhone de Binta" }
```

```jsonc
200 { "data": {
  "tokenType": "Bearer",
  "accessToken": "dza_…", "accessTokenExpiresAt": "2026-10-27T12:15:00.000Z",
  "refreshToken": "dzr_…", "refreshTokenExpiresAt": "2026-11-26T12:00:00.000Z",
  "user": { "id": "…", "name": "Binta Camara", "email": "binta.camara@doztra.com", "role": "agent" } } }
```

- `401` « E-mail ou mot de passe incorrect. » : même message que le compte existe ou non.
- `403` : compte désactivé.
- `429` : 5 tentatives par compte et 20 par adresse IP sur 15 minutes.
- `deviceName` est facultatif ; il aide à identifier la session.

### Rafraîchissement — `POST /auth/refresh`

```json
{ "refreshToken": "dzr_…" }
```

La réponse a la même forme que celle de la connexion. **Remplacez les deux jetons stockés.**

⚠️ **Rotation stricte.** Un jeton de rafraîchissement ne sert qu’une fois. Présenter un jeton
déjà consommé est interprété comme un vol : la session de l’appareil est révoquée et
l’utilisateur doit se reconnecter. Conséquences pour l’app :

- ne lancez **jamais deux rafraîchissements en parallèle**. Si plusieurs requêtes reçoivent
  un 401 en même temps, elles doivent attendre le même rafraîchissement (voir le client
  ci-dessous) ;
- enregistrez la nouvelle paire **avant** de rejouer les requêtes.

### Profil — `GET /auth/me`

Renvoie `{ id, name, email, role }`. Utile au démarrage pour vérifier la session stockée.

### Déconnexion — `POST /auth/logout`

Envoyez le jeton d’accès en en-tête Bearer. S’il a expiré, envoyez à la place
`{ "refreshToken": "dzr_…" }` dans le corps. Réponse `204`, même si la session était déjà
révoquée. Effacez ensuite les jetons du SecureStore.

---

## 3. Demandes

Une demande :

```jsonc
{
  "id": "6eb812dd-51fa-4f34-a51c-7d87d27d61b7",
  "customerName": "Hôtel Kaloum",
  "customerEmail": null,                      // null si non renseigné
  "customerPhone": "+224 657 33 90 01",       // conservé tel que saisi
  "subject": "Coupure du service depuis ce matin",
  "description": "Depuis 7h ce matin, …",     // texte brut, à afficher comme texte
  "isPriority": true,
  "createdAt": "2026-10-20T02:05:00.000Z",
  "updatedAt": "2026-10-20T02:05:00.000Z"
}
```

### Liste — `GET /requests?page=1`

```jsonc
{ "data": { "items": [ … ], "total": 26, "page": 1, "pageSize": 20, "pages": 2 } }
```

- Ordre fixé par le serveur : **prioritaires d’abord**, puis les plus récentes. Ne retriez
  pas côté app.
- 20 demandes par page. Une page hors bornes renvoie la **dernière page valide** : utilisez le
  champ `page` de la réponse pour vous recaler. Il n’y a pas de redirection.
- `total = 0` : affichez l’état vide « Aucune demande pour le moment » avec un bouton d’ajout.
- Il n’y a pas de temps réel : rechargez la liste au retour sur l’écran et sur un geste de
  rafraîchissement (« tirer pour actualiser »).

### Détail — `GET /requests/{id}`

`404` si la demande est inconnue ; `422` si l’identifiant n’est pas un UUID.

### Création — `POST /requests`

```json
{
  "submissionId": "0b7c1c1e-2f4a-4d8e-9c55-3a1f2e6b9d10",
  "customerName": "Hôtel Kaloum",
  "customerEmail": "",
  "customerPhone": "+224 657 33 90 01",
  "subject": "Coupure du service depuis ce matin",
  "description": "Depuis 7h ce matin, le système de réservation est inaccessible."
}
```

**`submissionId` est la clé anti-doublon.** Il fonctionne ainsi :

1. Générez-le **à l’ouverture du formulaire** avec `Crypto.randomUUID()` (`expo-crypto`).
2. Réutilisez **exactement le même** à chaque nouvelle tentative du même formulaire : erreur
   réseau, 503, délai dépassé, double appui sur « Enregistrer ».
3. Générez-en un **nouveau** seulement pour un nouveau formulaire, après un succès.

| Réponse | Signification | Action |
|---|---|---|
| `201` | Créée | Message « Demande enregistrée », retour à la liste |
| `200` | Déjà enregistrée à l’identique (réessai) | Comme un succès |
| `409` | Ce `submissionId` a déjà servi pour un contenu différent | Message, recharger la liste |
| `422` | Champs invalides | Erreurs sous les champs, **saisie conservée** |
| `503` | Base indisponible | Message, **saisie conservée**, réessayer avec le même `submissionId` |

N’affichez jamais « Demande enregistrée » avant d’avoir reçu un 201 ou un 200. La priorité et
les dates sont fixées par le serveur : si vous les envoyez, elles sont ignorées.

### Règles de saisie (aide côté app, contrôlées aussi par le serveur)

Les longueurs se mesurent **après suppression des espaces de début et de fin**.

| Champ | Obligatoire | Règle | Message serveur |
|---|---|---|---|
| `customerName` | oui | 2 à 150 caractères | « Indiquez le nom du client ou de l’entreprise. » / « Le nom doit contenir au moins 2 caractères. » |
| `subject` | oui | 3 à 200 caractères | « Indiquez l’objet de la demande. » / « L’objet doit contenir au moins 3 caractères. » |
| `description` | oui | 10 à 5 000 caractères | « Décrivez la demande du client. » / « La description doit contenir au moins 10 caractères. » |
| `customerEmail` | non | e-mail valide, 254 max ; vide → `null` | « Adresse e-mail invalide. Exemple : nom@entreprise.com » |
| `customerPhone` | non | texte libre, 30 max ; vide → `null` | « 30 caractères maximum (actuellement N). » |

- Ne normalisez **pas** le téléphone : `+`, zéros initiaux et espaces sont conservés.
- Le lien d’appel retire les espaces pour le lien uniquement, par exemple
  `tel:+224657339001`.
- Clavier conseillé : `email-address` pour l’e-mail, `phone-pad` pour le téléphone. Le
  compteur de la description s’affiche sous la forme `n / 5 000`.

### Priorité — `PATCH /requests/{id}/priority`

```json
{ "isPriority": true }
```

- Envoyez la **valeur souhaitée** : `true` pour « Marquer comme prioritaire », `false` pour
  « Retirer la priorité ». N’envoyez jamais une inversion calculée sur un état local périmé.
  `"true"` ou `1` sont refusés (422).
- Réponse `200` : `{ "data": { "id", "isPriority", "updatedAt" } }`. Renvoyer la même valeur
  est sans effet et sans erreur.
- Pendant l’envoi, désactivez le bouton et affichez « Mise à jour… ». En cas d’échec,
  **conservez l’état précédent** (pas de mise à jour optimiste conservée) et affichez le
  message. Après un succès, rechargez la liste : l’ordre change.

---

## 4. Affichage

- **Dates** : formatez en français dans le fuseau de Conakry.
  ```ts
  const fDate = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Conakry", day: "numeric", month: "short", year: "numeric" });
  const fTime = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Conakry", hour: "2-digit", minute: "2-digit" });
  // « 21 oct. 2026 · 06:42 »
  ```
  Vérifiez le support `Intl` de Hermes sur vos appareils cibles. Sinon, utilisez
  `date-fns-tz`.
- **Priorité** : indiquez-la par un **texte et un symbole** (« ★ Prioritaire » / « ○ Normale »),
  jamais par la couleur seule.
- **Textes** : description et coordonnées s’affichent comme du texte (`<Text>`), sans aucune
  interprétation HTML.
- **Libellés** : en français, avec l’apostrophe typographique `’`. La charte (couleurs,
  police Mulish) est celle du prototype web `docs/Doztra Demandes.dc.html`.

---

## 5. Client TypeScript de référence

Ce client gère le Bearer, le rafraîchissement unique partagé et les erreurs typées. Il
s’appuie sur `expo-secure-store` et `expo-crypto`.

```ts
// src/api/client.ts
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL!; // https://<domaine>/api/v1
const APP_VERSION = Constants.expoConfig?.version ?? "0.0.0";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string>) {
    super(message);
  }
}

type Tokens = { accessToken: string; refreshToken: string };

const store = {
  get: async (): Promise<Tokens | null> => {
    const raw = await SecureStore.getItemAsync("doztra.tokens");
    return raw ? JSON.parse(raw) : null;
  },
  set: (t: Tokens) => SecureStore.setItemAsync("doztra.tokens", JSON.stringify(t)),
  clear: () => SecureStore.deleteItemAsync("doztra.tokens"),
};

/** Appelé quand la session est perdue (401 après rafraîchissement, ou 403) : retour à la connexion. */
export let onSessionLost: (message: string) => void = () => {};
export const setOnSessionLost = (fn: typeof onSessionLost) => (onSessionLost = fn);

async function raw(path: string, init: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = { "X-App-Version": APP_VERSION, ...(init.headers as Record<string, string>) };
  if (init.body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error ?? { code: "INTERNAL_ERROR", message: "Réponse inattendue du serveur." };
    throw new ApiError(res.status, e.code, e.message, e.fields);
  }
  return body?.data;
}

// Un seul rafraîchissement à la fois : les requêtes en 401 attendent le même.
let refreshing: Promise<Tokens | null> | null = null;

function refreshTokens(): Promise<Tokens | null> {
  refreshing ??= (async () => {
    try {
      const current = await store.get();
      if (!current) return null;
      const data = await raw("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: current.refreshToken }) });
      const next = { accessToken: data.accessToken, refreshToken: data.refreshToken };
      await store.set(next); // enregistrer AVANT de rejouer
      return next;
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        await store.clear();
        onSessionLost(e.message);
        return null;
      }
      throw e; // réseau : garder les jetons, l’utilisateur réessaiera
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** Requête authentifiée : rafraîchit une fois sur 401, déconnecte sur 403. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const tokens = await store.get();
  try {
    return await raw(path, init, tokens?.accessToken);
  } catch (e) {
    if (!(e instanceof ApiError)) throw e;
    if (e.status === 403) {
      await store.clear();
      onSessionLost(e.message);
    }
    if (e.status !== 401) throw e;
    const next = await refreshTokens();
    if (!next) throw e;
    return raw(path, init, next.accessToken);
  }
}

export async function login(email: string, password: string, deviceName?: string) {
  const data = await raw("/auth/login", { method: "POST", body: JSON.stringify({ email, password, deviceName }) });
  await store.set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  return data.user as { id: string; name: string; email: string; role: "admin" | "agent" };
}

export async function logout() {
  const tokens = await store.get();
  if (tokens) {
    await raw("/auth/logout", { method: "POST", body: JSON.stringify({ refreshToken: tokens.refreshToken }) }, tokens.accessToken).catch(() => {});
  }
  await store.clear();
}
```

Utilisation :

```ts
import * as Crypto from "expo-crypto";

// Liste
const page = await api<RequestPage>(`/requests?page=${n}`);

// Création : submissionId créé à l’ouverture du formulaire et conservé jusqu’au succès
const [submissionId] = useState(() => Crypto.randomUUID());
const created = await api<CustomerRequest>("/requests", {
  method: "POST",
  body: JSON.stringify({ submissionId, ...values }),
});

// Priorité : valeur souhaitée explicite
await api(`/requests/${id}/priority`, { method: "PATCH", body: JSON.stringify({ isPriority: !request.isPriority }) });
```

Pour la mise en cache et les états de chargement, TanStack Query fonctionne bien avec ce
client. Après une création ou un changement de priorité, invalidez la requête de la liste.

---

## 6. Checklist d’intégration

- [ ] Jetons dans `expo-secure-store` uniquement ; aucun jeton dans les journaux ni dans les URL
- [ ] `X-App-Version` sur chaque requête ; écran « Mise à jour requise » sur 426
- [ ] 401 → un seul rafraîchissement partagé, puis rejeu ; échec → écran de connexion
- [ ] 403 → effacer les jetons, écran de connexion avec le message
- [ ] `submissionId` généré à l’ouverture du formulaire, réutilisé pour chaque nouvelle tentative
- [ ] Succès affiché seulement après 201 ou 200 ; saisie conservée sur 422, 503 et erreur réseau
- [ ] Priorité envoyée comme valeur explicite ; bouton désactivé pendant l’envoi ; état précédent conservé en cas d’échec
- [ ] Dates affichées en fuseau Africa/Conakry ; priorité indiquée par texte et symbole
- [ ] Liste rechargée au retour sur l’écran et sur « tirer pour actualiser »
- [ ] HTTPS partout, y compris en développement sur appareil réel (tunnel)
