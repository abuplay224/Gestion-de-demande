---
name: doztra-demandes-nextjs
description: Utiliser pour écrire ou relire le code serveur de Doztra Demandes en Next.js App Router + Prisma + PostgreSQL — schéma et migrations, Server Actions de création et de priorité, requête de liste paginée, invalidation du cache, erreurs structurées, jeu de données fictives.
---

# Doztra Demandes — Architecture Next.js, Prisma, PostgreSQL

Les règles de comportement viennent de `doztra-demandes-business-rules` (RG1–RG20).
Ce skill décrit **comment** les implémenter côté serveur.

---

## 1. Principes d'organisation

| Rôle | Emplacement | Nature |
|---|---|---|
| Lecture de la liste | `app/demandes/page.tsx` | Server Component |
| Formulaire, panneau, bouton priorité | `components/demandes/*` | Client Components |
| Création, changement de priorité | `server/actions/*` | Server Actions |
| Accès PostgreSQL | `lib/db.ts` + `server/queries/*` | Module serveur dédié |

- Pas de backend séparé, pas d'API REST publique.
- Aucune connexion base exposée au navigateur.
- `lib/db.ts` commence par `import 'server-only';` — une fuite d'import côté client doit
  casser le build, pas s'exécuter.
- Toute fonction serveur commence par la vérification du contexte utilisateur
  (`doztra-demandes-securite-recette`).

---

## 2. Schéma Prisma

```prisma
model CustomerRequest {
  id            String   @id @db.Uuid
  customerName  String   @map("customer_name")  @db.VarChar(150)
  customerEmail String?  @map("customer_email") @db.VarChar(254)
  customerPhone String?  @map("customer_phone") @db.VarChar(30)
  subject       String   @db.VarChar(200)
  description   String   @db.Text
  isPriority    Boolean  @default(false) @map("is_priority")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt     DateTime @map("updated_at") @db.Timestamptz(3)

  @@index([isPriority(sort: Desc), createdAt(sort: Desc), id(sort: Desc)], map: "idx_requests_list")
  @@map("customer_requests")
}
```

`id` est fourni par l'application (UUID de soumission, RG7) : pas de `@default(uuid())`,
sinon l'idempotence devient impossible à garantir.

`updatedAt` n'utilise **pas** `@updatedAt` : RG19 impose une mise à jour uniquement sur
changement réel, donc la valeur est écrite explicitement.

### Contraintes CHECK (migration SQL manuelle)

Prisma ne génère pas les CHECK : les ajouter dans la migration.

```sql
ALTER TABLE customer_requests
  ADD CONSTRAINT chk_customer_name_len CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 150),
  ADD CONSTRAINT chk_subject_len       CHECK (char_length(btrim(subject))       BETWEEN 3 AND 200),
  ADD CONSTRAINT chk_description_len   CHECK (char_length(description)          BETWEEN 10 AND 5000),
  ADD CONSTRAINT chk_email_len         CHECK (customer_email IS NULL OR char_length(customer_email) <= 254),
  ADD CONSTRAINT chk_phone_len         CHECK (customer_phone IS NULL OR char_length(customer_phone) <= 30);
```

La base est la dernière barrière : la validation applicative ne la remplace pas.

Migrations **versionnées** et committées. Jamais de `prisma db push` sur un environnement
partagé.

---

## 3. Erreurs structurées

```ts
// lib/errors.ts
export type AppErrorCode =
  | 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; message: string; fields?: Record<string, string> };
```

Les Server Actions **retournent** un `ActionResult` au lieu de lever une exception, pour
que l'interface conserve la saisie (RG10). Les détails techniques sont journalisés
côté serveur ; `message` est le texte destiné à l'utilisateur.

```ts
export function logServerError(scope: string, e: unknown) {
  // jamais de description ni de coordonnées dans le journal
  console.error(`[${scope}]`, e instanceof Error ? e.message : 'erreur inconnue');
}
```

---

## 4. Lecture de la liste

```ts
// server/queries/list-requests.ts
import 'server-only';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';

export const PAGE_SIZE = 20;

export async function listRequests(page: number) {
  await requireUser();                                     // R15

  const total = await prisma.customerRequest.count();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(Math.max(1, page), pages);      // RG14

  const items = await prisma.customerRequest.findMany({
    orderBy: [                                             // RG12
      { isPriority: 'desc' },
      { createdAt: 'desc' },
      { id: 'desc' },
    ],
    skip: (current - 1) * PAGE_SIZE,                       // RG13 : tri avant découpage
    take: PAGE_SIZE,
  });

  return { items, total, page: current, pageSize: PAGE_SIZE, pages };
}
```

La page vient de `searchParams` (`/demandes?page=3`), validée par `pageSchema`. Une page
hors bornes est ramenée à la dernière page valide ; le Server Component peut aussi
`redirect()` vers l'URL corrigée pour que le lien partagé reste cohérent.

---

## 5. Création idempotente

```ts
// server/actions/create-request.ts
'use server';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createRequestSchema } from '@/server/validation/request.schema';
import { revalidatePath } from 'next/cache';

export async function createRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireUser();                                      // R15

  const parsed = createRequestSchema.safeParse(input);      // RG6
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Vérifiez les champs signalés.',
             fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  try {
    const existing = await prisma.customerRequest.findUnique({ where: { id: d.submissionId } });
    if (existing) {                                         // RG7
      const identique =
        existing.customerName  === d.customerName  &&
        existing.subject       === d.subject       &&
        existing.description   === d.description   &&
        existing.customerEmail === d.customerEmail &&
        existing.customerPhone === d.customerPhone;

      if (identique) return { ok: true, data: { id: existing.id } };
      return { ok: false, code: 'CONFLICT',
        message: 'Cette demande a déjà été enregistrée avec un contenu différent. Rechargez la liste avant de réessayer.' };
    }

    const now = new Date();
    const created = await prisma.customerRequest.create({   // écriture atomique unique
      data: {
        id: d.submissionId,
        customerName: d.customerName,
        subject: d.subject,
        description: d.description,
        customerEmail: d.customerEmail,                     // RG2 : null si vide
        customerPhone: d.customerPhone,                     // RG3 : tel quel
        isPriority: false,                                  // RG5
        createdAt: now,
        updatedAt: now,
      },
    });

    revalidatePath('/demandes');
    return { ok: true, data: { id: created.id } };
  } catch (e) {
    // P2002 : course entre deux envois simultanés du même UUID → relire et appliquer RG7
    logServerError('createRequest', e);
    return { ok: false, code: 'INTERNAL_ERROR',
      message: 'La base de données est momentanément indisponible. Votre saisie est conservée : vous pouvez réessayer sans risque de doublon.' };
  }
}
```

**Génération de l'UUID de soumission** : côté serveur, au rendu du formulaire
(`crypto.randomUUID()` dans le Server Component `app/demandes/nouvelle/page.tsx`), passé
en champ caché au Client Component. Un nouveau formulaire reçoit un nouvel UUID.

En cas de collision applicative sur `create` (deux envois simultanés), relire la ligne et
appliquer la même comparaison que ci-dessus plutôt que de renvoyer une erreur technique.

---

## 6. Changement de priorité

```ts
// server/actions/set-request-priority.ts
'use server';

export async function setRequestPriority(input: unknown): Promise<ActionResult<Row>> {
  await requireUser();

  const parsed = setPrioritySchema.safeParse(input);        // RG18 : booléen strict
  if (!parsed.success) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Demande invalide.' };
  }
  const { id, isPriority } = parsed.data;

  try {
    const result = await prisma.customerRequest.updateMany({
      where: { id, isPriority: { not: isPriority } },       // RG19 : écrit seulement si ça change
      data:  { isPriority, updatedAt: new Date() },
    });

    const row = await prisma.customerRequest.findUnique({
      where: { id },
      select: { id: true, isPriority: true, updatedAt: true },
    });
    if (!row) return { ok: false, code: 'NOT_FOUND', message: 'Demande introuvable.' };  // R14

    void result;                                            // 0 ligne = déjà à cette valeur, succès (RG18)
    revalidatePath('/demandes');
    return { ok: true, data: row };
  } catch (e) {
    logServerError('setRequestPriority', e);
    return { ok: false, code: 'INTERNAL_ERROR',
      message: 'Impossible de modifier la priorité. L’état précédent est conservé.' };   // RG20
  }
}
```

Jamais `isPriority: !current` : RG18. Jamais `update` sur une condition `{ id }` seule
avec `updatedAt: now()` inconditionnel : RG19.

---

## 7. Invalidation et rafraîchissement

- Après chaque écriture réussie : `revalidatePath('/demandes')`.
- Côté client, après une création : navigation vers `/demandes` (page 1) puis
  `router.refresh()` si nécessaire — la nouvelle position est ainsi prévisible (RG9).
- Après un changement de priorité depuis la liste : revenir en page 1 pour que la
  nouvelle position soit visible.
- Aucun `cache: 'force-cache'` ni `export const revalidate = <n>` sur la liste : les
  données sont dynamiques et sensibles. `export const dynamic = 'force-dynamic'` sur
  `/demandes` est acceptable et explicite.

---

## 8. Dates et fuseau

- Stockage : `TIMESTAMPTZ`, valeurs serveur, UTC.
- Affichage : `Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Conakry', … })`.

```ts
// lib/format.ts
const TZ = 'Africa/Conakry';
export const fDate = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
export const fTime = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
```

Formater dans le même module côté serveur et côté client pour éviter les écarts
d'hydratation : ne jamais utiliser le fuseau du navigateur.

---

## 9. Jeu de données fictives

`prisma/seed.ts` reprend les demandes du prototype (entreprises et particuliers guinéens,
quelques prioritaires, des coordonnées parfois absentes) — utile pour R07, R08 et la
cible de performance sur 1 000 lignes.

- Dates échelonnées sur plusieurs jours pour éprouver le tri.
- Au moins une demande sans e-mail, une sans téléphone, une sans aucune coordonnée.
- Au moins un objet et une description très longs (R16 côté mise en page).
- **Jamais de données réelles de clients** dans le seed, et base de développement
  distincte de la production.

---

## 10. Avant de valider une modification

- [ ] `import 'server-only'` présent dans tout module d'accès base
- [ ] `requireUser()` en première ligne de chaque action et requête
- [ ] Entrée validée par Zod avant tout accès base
- [ ] Une seule écriture atomique par opération
- [ ] `revalidatePath('/demandes')` après écriture réussie
- [ ] Aucune requête SQL construite par concaténation
- [ ] Aucune description ni coordonnée dans les journaux
- [ ] Migration versionnée committée, CHECK inclus
- [ ] Index `(is_priority DESC, created_at DESC, id DESC)` présent
