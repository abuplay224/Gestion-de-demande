---
name: doztra-demandes-ui
description: Utiliser pour implémenter ou relire l'interface de Doztra Demandes en Next.js + Tailwind CSS + shadcn/ui — jetons de design exacts du prototype, Mulish, inventaire des 3 écrans et de leurs états, composants, responsive tableau/cartes, accessibilité clavier.
---

# Doztra Demandes — Interface

Jetons et comportements extraits du prototype validé (`Doztra Demandes.dc.html`).
Les règles de comportement viennent de `doztra-demandes-business-rules`.

---

## 1. Jetons de design

### Couleurs

| Rôle | Valeur |
|---|---|
| Fond de page | `#EDEFF3` |
| Surface principale | `#FFFFFF` |
| Surface douce | `#F6F7F9` · `#F5F6F8` |
| Texte principal | `#0E1020` |
| Texte secondaire | `#2A2D3D` |
| Texte atténué | `#6B7083` · `#4B5063` |
| Bordure fine | `#EEF0F3` · `#ECEEF2` |
| Bordure de contrôle | `#E3E5EB` |
| Fond de champ | `#FAFBFC` |
| **Primaire** | `#7B5CF5` |
| Primaire survol | `#6A4BEA` |
| Primaire pressé / accent texte | `#5A3BE0` |
| Lien | `#6A4BEA`, survol `#4F32C9` |
| En-tête sombre | `#0B0D17`, dégradé radial vers `#1B1F33` |
| Surface sombre | `#1C2033` · `#2A2F47` (bordure `#3A3F5A`) |
| Texte sur sombre | `#FFFFFF`, atténué `#A5A9BC`, doux `#D9DBE8` |
| Badge prioritaire | fond `#FDE8EF`, texte `#B0174A` |
| Badge normale | fond `#F0F1F4`, texte `#4B5063` |
| Erreur — surface | `#FFF5F7`, bordure `#F8D4DE`, pastille `#FDE3EA` |
| Erreur — texte | `#C2224F`, titre `#8E1638`, bordure de champ `#E5376B` |
| Étoile « marquer » | `#E5376B` ; « retirer » `#6B7083` ; sur fond sombre `#FF7AA2` / `#A5A9BC` |
| Ligne nouvellement créée | `#F3F0FE` (fondu ~2,6 s) |

Palette d'avatars (fond, texte), choisie de façon déterministe à partir de l'identifiant :

```
#EEE9FE/#5A3BE0 · #FDE8EF/#B0174A · #E3F6EC/#16794A
#FFF2DC/#9A5B00 · #E4EEFD/#2456B8 · #EAEBF0/#3A3F55
```

### Typographie

- Famille : **Mulish** (400, 500, 600, 700, 800), repli `system-ui, sans-serif`.
- Monospace : **JetBrains Mono** — uniquement pour l'identifiant UUID.
- Titre de page : `clamp(28px, 5.4vw, 40px)`, poids 800, `letter-spacing: -0.025em`.
- Titre de section : 17 px / 800 · titre de panneau : 22 px / 800.
- Corps : 14–15 px · légendes : 12,5 px · micro-légendes : 11,5 px.
- Libellés de section en capitales : 12 px, 800, `letter-spacing: .08em`.
- **Champs de saisie : 16 px minimum** — en dessous, iOS zoome à la mise au point.

### Formes et espacement

- Rayons : contrôles 10–14 px · cartes et surfaces `clamp(18px, 2.4vw, 24px)` ·
  en-tête `clamp(18px, 2.4vw, 26px)` · badges `99px`.
- Gouttière de page : `clamp(10px, 2.4vw, 24px)`, largeur maximale **1320 px**.
- Formulaire : largeur maximale **820 px**, centré.
- Panneau de détail : `min(480px, 100%)`, pleine hauteur, à droite.
- Hauteurs minimales : action principale 48–50 px · action secondaire 44 px ·
  bouton compact de tableau 38 px.
- Focus visible global : `outline: 2.5px solid #7B5CF5; outline-offset: 2px`. Ne jamais
  le supprimer.

### Tailwind

Déclarer ces jetons dans `tailwind.config.ts` (`theme.extend.colors` : `doztra.primary`,
`doztra.ink`, `doztra.muted`, `doztra.priority`, …) et les brancher sur les variables CSS
de shadcn/ui (`--primary`, `--destructive`, `--muted-foreground`, `--border`, `--ring`).
Aucune couleur en dur dans les composants : toujours une classe issue des jetons.

---

## 2. Correspondance shadcn/ui

| Élément | Composant |
|---|---|
| Boutons | `Button` (variantes `default` primaire, `outline`, `ghost`) |
| Champs | `Input`, `Textarea`, `Label` |
| Liste bureau | `Table` |
| Liste mobile | `Card` |
| Priorité | `Badge` |
| Détail | `Sheet` (côté droit) |
| Erreurs de formulaire et de liste | `Alert` |
| Chargement | `Skeleton` |
| Pagination | `Pagination` |
| Confirmations | `Sonner` / `Toast` |

Les composants sont **intégrés au projet** (`npx shadcn@latest add …`) puis adaptés aux
jetons ci-dessus, pas consommés depuis une dépendance externe.

---

## 3. Écrans

### 3.1 Liste — `/demandes`

En-tête sombre : logo carré `D` sur `#7B5CF5`, nom « Doztra », onglet « Demandes »
(≥ 960 px), mention « Équipe Doztra » et avatar de l'utilisateur.

Bloc titre : « Demandes clients » + compteur `{n} demandes · {p} prioritaires`
(« Aucune demande enregistrée » si vide) + bouton primaire « + Ajouter une demande ».

Carte blanche : « Registre des demandes » / « Prioritaires d'abord, puis les plus
récentes », puis l'un des quatre états.

**Tableau (≥ 960 px)** — colonnes : Client (24 %), Objet (flexible), Créée le (150 px),
Priorité (130 px), Actions (262 px, alignées à droite). `table-layout: fixed`, en-tête
`#F5F6F8` avec coins arrondis aux extrémités, lignes séparées par `#EEF0F3`.
Nom et objet tronqués en une ligne avec `title` complet.

**Cartes (< 960 px)** — grille `repeat(auto-fill, minmax(min(100%,300px), 1fr))` :
avatar + nom + date/heure + badge, encadré « Objet » sur `#F5F6F8` (2 lignes maximum),
puis les deux actions. **Aucun défilement horizontal de la page.**

Pagination : `Page {p} sur {n} · {début}–{fin} sur {total}`, boutons « ‹ Précédent » et
« Suivant › », désactivés et à 40 % d'opacité aux extrémités.

### 3.2 Création — `/demandes/nouvelle`

En-tête sombre avec retour « ← Demandes », titre « Nouvelle demande », mention
« Les champs marqués d'un astérisque (*) sont obligatoires. ».

Deux `fieldset` avec `legend` : **Client** (nom obligatoire, e-mail et téléphone
facultatifs côte à côte dès 240 px de colonne) et **Demande** (objet, description).

- Compteur de description vivant : `{n} / 5 000`, en `#C2224F` hors bornes,
  `aria-live="polite"`.
- Placeholder du téléphone : `+224 6XX XX XX XX`.
- Bandeau d'erreur `role="alert"` en haut du formulaire en cas d'échec serveur.
- Actions en bas à droite : « Annuler » (contour) puis « Enregistrer » (primaire),
  `flex-wrap: wrap-reverse` pour que l'action principale reste en haut sur mobile.
- Pendant l'envoi : bouton désactivé, `aria-busy`, libellé « Enregistrement… ».

### 3.3 Détail — panneau depuis la liste

`Sheet` à droite, `role="dialog"`, `aria-modal="true"`, `aria-labelledby` sur l'objet.
Voile `rgba(8,10,20,.48)`. Contenu : badge de priorité, objet, description complète
(`white-space: pre-wrap`, `overflow-wrap: anywhere`), bloc client (avatar, nom, e-mail en
`mailto:`, téléphone en `tel:`, « Non renseigné » sinon), dates de création et de
modification, identifiant en monospace, mention « Heures affichées dans le fuseau
Africa/Conakry. Lecture seule. », et l'action de priorité en pied, pleine largeur.

Aucune route de détail : le panneau utilise les données de la page courante.

---

## 4. États

| État | Rendu |
|---|---|
| Chargement | 5 `Skeleton` de ligne, `role="status"`, `aria-live="polite"`, texte masqué « Chargement des demandes… » |
| Erreur | Encadré `#FFF5F7`, `role="alert"`, « Impossible de charger les demandes » / « Vérifiez votre connexion puis réessayez. » + bouton sombre « Réessayer » |
| Vide | Encadré `#F6F7F9`, pastille `+`, « Aucune demande pour le moment » / « Les demandes saisies par l'équipe apparaîtront ici. » + bouton primaire « Ajouter une demande » |
| Données | Tableau ou cartes + pagination |

Les quatre états sont **mutuellement exclusifs** ; la pagination n'apparaît qu'avec des
données.

**Toasts** : `#0E1020` avec `✓` pour un succès, `#B0174A` avec `!` pour un échec,
`role="status"`, disparition après ~3,2 s, centré en bas, largeur maximale
`calc(100vw - 32px)`.

**Action de priorité** : libellé « Marquer comme prioritaire » / « Retirer la priorité » /
« Mise à jour… » pendant l'envoi ; glyphe `★` pour marquer, `☆` pour retirer ; bouton
désactivé et opacité 0,55 pendant l'envoi.

---

## 5. Accessibilité

- Priorité signalée par **texte + symbole**, jamais par la couleur seule.
- Chaque champ a un `label` lié par `for`/`id` ; l'erreur est reliée par
  `aria-describedby` et le champ porte `aria-invalid`.
- À la soumission invalide, le focus va au **premier champ fautif**.
- Ouverture du panneau : focus sur le bouton de fermeture. Fermeture (bouton, `Échap`,
  clic sur le voile) : focus rendu à l'élément déclencheur. Piégeage du focus dans le
  panneau tant qu'il est ouvert.
- Cibles tactiles ≥ 44 px sur mobile.
- Contrastes : vérifier chaque paire texte/fond en AA (4,5:1). Le texte atténué
  `#6B7083` sur blanc passe ; ne pas l'éclaircir davantage.
- `aria-busy` sur tout contrôle en cours d'envoi.
- Les animations restent décoratives : prévoir `@media (prefers-reduced-motion: reduce)`.

---

## 6. Sécurité côté rendu

- La description et les coordonnées sont rendues comme **texte**. Jamais
  `dangerouslySetInnerHTML` sur une valeur saisie.
- `mailto:` et `tel:` construits par encodage, jamais par concaténation brute ; le lien
  `tel:` retire les espaces **pour le lien seulement**, la valeur affichée et stockée
  reste intacte.
- Aucune donnée de demande dans l'URL, le `localStorage` ou un journal navigateur.

---

## 7. Avant de valider une modification

- [ ] Aucune couleur en dur hors jetons
- [ ] Champs à 16 px minimum
- [ ] Bascule tableau/cartes à 960 px, sans défilement horizontal
- [ ] Les quatre états de liste existent et sont exclusifs
- [ ] Textes longs tronqués sans casser la grille, valeur complète accessible
- [ ] Focus visible partout, retour du focus à la fermeture du panneau
- [ ] Priorité lisible sans la couleur
- [ ] Libellés et messages en français avec apostrophe typographique `’`
