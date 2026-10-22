# Cahier des charges — Doztra
## Application de gestion des demandes clients — MVP
Version 1.0 • 21 octobre 2026 • Proposition de cadrage pour implémentation

## 1. Objectif
Centraliser les demandes clients de Doztra dans une application web simple permettant à l’équipe de saisir une demande, consulter les demandes enregistrées et identifier celles à traiter en priorité.

Le résultat attendu est un registre partagé, persistant et utilisable sur ordinateur et téléphone. Ce MVP ne couvre pas encore le suivi complet de résolution des demandes.

## 2. Périmètre et hypothèses
### Exigences confirmées
- Ajouter une demande.
- Afficher les demandes.
- Marquer une demande comme prioritaire.
- Utiliser Next.js pour le full stack, PostgreSQL pour les données et shadcn/ui pour les composants.

### Hypothèses de conception retenues
- Usage interne : les collaborateurs de Doztra saisissent les demandes reçues des clients.
- Une seule organisation et une liste partagée ; tous les utilisateurs autorisés disposent des mêmes droits.
- Interface en français ; connexion Internet requise.
- Une demande comporte un client, un objet et une description ; ses coordonnées sont facultatives.
- Une priorité possède deux valeurs : normale ou prioritaire. Retirer la priorité est inclus pour corriger une manipulation.
- Une protection d’accès doit être disponible avant utilisation avec des données réelles. Son mécanisme reste à choisir.
- Pas de tableau de bord statistique, de portail client ni de gestion des comptes dans ce périmètre métier.

Ces hypothèses constituent des choix proposés, et non des besoins déjà confirmés par Doztra.

### Hors périmètre
Modification du contenu après création, suppression, statuts de traitement, clôture, attribution à un agent, commentaires, pièces jointes, notifications, intégrations e-mail/WhatsApp/Telegram, recherche avancée, exports et synchronisation temps réel. Les demandes ne peuvent donc pas encore être indiquées comme résolues.

## 3. Utilisateurs et parcours
Utilisateur : collaborateur autorisé de Doztra.

Parcours principal :
1. Accéder à la liste des demandes.
2. Cliquer sur « Ajouter une demande ».
3. Saisir les informations et cliquer sur « Enregistrer ».
4. Retrouver la demande dans la liste.
5. Cliquer sur « Marquer comme prioritaire » si nécessaire.

Le client final n’accède pas à l’application dans cette version.

## 4. Exigences fonctionnelles

### F01 — Ajouter une demande
Un formulaire est accessible depuis la liste.

| Champ | Obligatoire | Règle |
|---|---|---|
| Nom du client ou de l’entreprise | Oui | 2 à 150 caractères |
| Objet | Oui | 3 à 200 caractères |
| Description | Oui | 10 à 5 000 caractères |
| E-mail | Non | Format e-mail valide, 254 caractères maximum |
| Téléphone | Non | Texte, 30 caractères maximum ; conserver les indicatifs et zéros initiaux |

Les limites portent sur les valeurs après suppression des espaces en début et fin. Une valeur obligatoire composée uniquement d’espaces est refusée. Les coordonnées vides sont enregistrées comme nulles. Aucune unicité n’est imposée sur le nom ou les coordonnées.

À l’enregistrement :
- Valider les données côté serveur, avec aide à la saisie côté interface.
- Attribuer automatiquement un identifiant, une date de création et la priorité normale.
- Désactiver le bouton pendant l’envoi et afficher « Enregistrement… ».
- Après confirmation de la base, afficher « Demande enregistrée » et revenir à la liste.
- En cas d’erreur, conserver la saisie et afficher une explication exploitable.
- « Annuler » revient à la liste sans enregistrer.

Prévention des doublons techniques : attribuer un UUID de demande au formulaire côté serveur et le conserver pour toute nouvelle tentative du même enregistrement. Une répétition avec le même UUID et le même contenu retourne la demande existante ; avec un contenu différent, elle retourne un conflit et demande de recharger la liste. Un nouveau formulaire reçoit un nouvel UUID. Deux demandes métier distinctes peuvent avoir le même contenu.

### F02 — Afficher les demandes
La liste présente :
- Nom du client.
- Objet.
- Date et heure de création.
- Indication « Normale » ou « Prioritaire ».
- Action de priorité.
- Action « Voir » ouvrant la description et les coordonnées en lecture seule.

L’identifiant complet est disponible dans le détail. Les textes longs ne doivent pas casser la mise en page.

Ordre d’affichage :
1. Demandes prioritaires en premier.
2. Dans chaque groupe, demandes les plus récentes en premier.
3. En cas d’égalité des dates, identifiant décroissant pour un ordre déterministe.

Pagination serveur de 20 demandes par page, avec précédent/suivant. La priorité est appliquée avant pagination.

États attendus :
- Liste vide : « Aucune demande pour le moment », avec action d’ajout.
- Chargement : indicateur visuel.
- Erreur : message « Impossible de charger les demandes » et bouton « Réessayer ».

Les données doivent rester présentes après actualisation, fermeture du navigateur et redémarrage de l’application. Les changements d’un autre utilisateur deviennent visibles à l’actualisation ; aucun temps réel n’est prévu.

### F03 — Gérer la priorité
Chaque demande dispose d’une action :
- « Marquer comme prioritaire » si elle est normale.
- « Retirer la priorité » si elle est prioritaire.

Le serveur reçoit la valeur souhaitée true ou false, et non une instruction ambiguë d’inversion. Répéter la même action conserve le même résultat.

Après succès, le badge et l’ordre de la liste sont actualisés ; revenir à la première page rend la nouvelle position prévisible. Le bouton concerné est désactivé pendant l’envoi. En cas d’échec, l’interface conserve l’état confirmé précédemment et affiche une erreur.

La priorité est indiquée par un texte et un symbole, sans dépendre seulement de la couleur. Elle n’entraîne aucune notification ni échéance automatique.

Si deux utilisateurs modifient simultanément la priorité, la dernière écriture confirmée par la base fait foi. Ce compromis est accepté pour le MVP.

## 5. Écrans et ergonomie
| Écran | Route proposée | Contenu |
|---|---|---|
| Liste | /demandes | Nom Doztra, titre, bouton d’ajout, liste, pagination |
| Création | /demandes/nouvelle | Formulaire, erreurs par champ, boutons Enregistrer et Annuler |
| Détail en lecture seule | Panneau depuis la liste | Objet, description complète, client, coordonnées, dates, identifiant |

La route / redirige vers /demandes. Le panneau de détail utilise les données de la page courante ; aucune route de détail supplémentaire n’est nécessaire.

Design sobre, fond clair et une couleur principale à confirmer selon la charte Doztra. Sur ordinateur : tableau. Sur mobile : cartes affichant les mêmes informations essentielles, sans défilement horizontal de la page.

Composants shadcn/ui proposés : Button, Input, Textarea, Label, Table, Card, Badge, Sheet, Alert, Skeleton et Pagination. Les composants sont intégrés au projet et adaptés à la charte.

Exigences : navigation clavier, focus visible, champs avec libellés, messages d’erreur associés aux champs et retour du focus après fermeture du panneau.

## 6. Architecture technique
### Stack imposée
- Next.js avec App Router : interface et logique serveur dans le même projet.
- PostgreSQL : stockage persistant.
- shadcn/ui : composants d’interface.

### Choix complémentaires proposés
- TypeScript.
- Tailwind CSS pour les styles.
- Prisma pour l’accès aux données et les migrations.
- Zod pour la validation.

Ces compléments sont des choix de conception proposés. Utiliser des versions stables compatibles au démarrage et conserver un fichier de verrouillage des dépendances. Aucun numéro de version n’est imposé dans ce document.

### Organisation
- Server Components : lecture de la liste.
- Client Components : interactions du formulaire et du panneau.
- Server Actions : création et mise à jour de la priorité.
- Module serveur dédié : accès à PostgreSQL.
- Après une écriture réussie : invalider /demandes et rafraîchir les données affichées.
- Ne pas exposer de connexion à la base dans le navigateur.
- Pas de backend séparé ni d’API REST publique pour ce MVP.

Next.js documente les Server Functions pour les écritures, ainsi que la revalidation des données après mutation. Les contrôles d’accès doivent être exécutés dans les fonctions serveur, et pas uniquement dans l’interface.

### Contrats applicatifs
| Opération | Entrée | Sortie attendue |
|---|---|---|
| listRequests | Numéro de page entier positif | Demandes triées, total, page, taille de page |
| createRequest | UUID de soumission et champs du formulaire | Demande créée ou erreurs de validation |
| setRequestPriority | UUID et booléen strict | Identifiant, priorité et date de modification confirmés |

Erreurs structurées : VALIDATION_ERROR, UNAUTHORIZED, NOT_FOUND, CONFLICT et INTERNAL_ERROR. Les erreurs techniques détaillées restent dans les journaux serveur. Pour une page supérieure au nombre de pages, rediriger vers la dernière page valide ; une liste vide utilise la page 1.

## 7. Modèle de données
Une seule table métier : customer_requests. Les éventuelles tables du fournisseur d’identité dépendent du mécanisme d’accès retenu.

| Colonne | Type PostgreSQL | Contraintes |
|---|---|---|
| id | UUID | Clé primaire ; généré côté serveur pour le formulaire |
| customer_name | VARCHAR(150) | NOT NULL, longueur minimale 2 |
| customer_email | VARCHAR(254) | Nullable |
| customer_phone | VARCHAR(30) | Nullable |
| subject | VARCHAR(200) | NOT NULL, longueur minimale 3 |
| description | TEXT | NOT NULL, longueur de 10 à 5 000 |
| is_priority | BOOLEAN | NOT NULL, DEFAULT false |
| created_at | TIMESTAMPTZ | NOT NULL, valeur serveur à la création |
| updated_at | TIMESTAMPTZ | NOT NULL, valeur serveur à chaque modification réelle |

Ajouter des contraintes CHECK pour les longueurs obligatoires. Stocker des horodatages avec fuseau, afficher en français dans le fuseau Africa/Conakry proposé pour Doztra.

Index de liste proposé : (is_priority DESC, created_at DESC, id DESC).
Tri correspondant : ORDER BY is_priority DESC, created_at DESC, id DESC.

Pas de table clients distincte : les informations du client sont attachées à chaque demande. Une modification ultérieure d’un client ne met donc pas à jour automatiquement les anciennes demandes.

## 8. Accès, fiabilité et exploitation
- Démonstration locale possible avec des données fictives.
- Pour les données réelles : accès réservé aux collaborateurs autorisés, sans inscription publique.
- Choisir avant déploiement un fournisseur d’identité ou une passerelle d’accès protégeant toutes les routes et actions ; aucune donnée client accessible anonymement.
- Vérifier le contexte utilisateur côté serveur pour les lectures et écritures.
- Utiliser HTTPS en déploiement et stocker les secrets dans les variables d’environnement.
- Requêtes paramétrées via l’outil d’accès à la base ; aucune concaténation SQL de saisies.
- Afficher les descriptions comme du texte ; ne pas interpréter du HTML fourni par l’utilisateur.
- Ne pas journaliser les descriptions et coordonnées en clair.
- Base de développement distincte de la production ; données de test fictives.
- Migrations versionnées ; sauvegarde quotidienne proposée et procédure de restauration documentée.
- Une seule écriture atomique pour chaque création ou changement de priorité.
- L’absence de connexion ne doit jamais afficher une fausse confirmation de sauvegarde.

Cible de performance proposée pour la recette : sur 1 000 demandes fictives et 5 utilisateurs simultanés, 95 % des chargements de liste et mutations en moins de 2 secondes, hors démarrage à froid, sur connexion stable. Mesurer dans l’environnement retenu ; il s’agit d’un objectif à vérifier, pas d’une garantie acquise.

## 9. Recette et critères d’acceptation
| ID | Scénario | Résultat attendu |
|---|---|---|
| R01 | Saisie valide, coordonnées absentes | Demande créée, priorité normale, date automatique |
| R02 | Champ obligatoire vide ou hors limites | Refus, erreur au bon champ, aucune ligne créée |
| R03 | E-mail renseigné mais invalide | Refus avec message compréhensible |
| R04 | Coordonnées valides, téléphone avec + et zéro | Valeurs conservées correctement |
| R05 | Double clic ou répétition du même envoi | Une seule demande pour le même UUID |
| R06 | Actualisation et redémarrage de l’application | Demandes conservées en PostgreSQL |
| R07 | Aucune demande | État vide et bouton d’ajout visibles |
| R08 | Plus de 20 demandes | Pagination et ordre global corrects |
| R09 | Marquage prioritaire | Badge, tri et valeur persistée mis à jour |
| R10 | Retrait de priorité | Retour au groupe normal, ordre chronologique respecté |
| R11 | Mise à jour répétée vers la même valeur | État stable, sans inversion involontaire |
| R12 | Base indisponible à la création | Erreur, saisie conservée, aucun faux succès |
| R13 | Échec de changement de priorité | Ancien état conservé et nouvelle tentative possible |
| R14 | Identifiant absent ou invalide | Erreur contrôlée, aucune autre ligne modifiée |
| R15 | Visiteur non autorisé, y compris appel serveur direct | Aucune lecture ni écriture autorisée |
| R16 | Navigation mobile et clavier | Fonctions accessibles, aucun élément essentiel masqué |
| R17 | Modification depuis une autre session puis actualisation | Dernier état confirmé visible |
| R18 | Même UUID, contenu différent | Conflit explicite, pas d’écrasement |
| R19 | Texte contenant des balises ou une tentative SQL | Texte inoffensif ou refus validé, aucune exécution |

Tests attendus : validation et règles métier, intégration sur PostgreSQL de test, parcours de bout en bout création → liste → priorité → actualisation, puis vérification manuelle mobile/clavier. La recette couvre les trois fonctions et la protection d’accès retenue.

## 10. Livrables
- Code source versionné du projet Next.js.
- Interface française intégrée avec shadcn/ui.
- Schéma PostgreSQL et migrations.
- Jeu de données fictives pour démonstration.
- Tests couvrant les parcours critiques.
- README : prérequis, installation, configuration, migrations, lancement, tests et déploiement.
- Fichier .env.example sans secrets, incluant DATABASE_URL et les paramètres d’accès nécessaires.
- Guide utilisateur court : ajouter, consulter, prioriser.
- Environnement de démonstration protégé et compte rendu de recette.

## 11. Étapes de réalisation
1. Confirmer les hypothèses : champs, accès interne, retrait de priorité et hébergement.
2. Initialiser Next.js, TypeScript, shadcn/ui et PostgreSQL.
3. Définir les migrations et la validation.
4. Réaliser la liste et la consultation du détail.
5. Réaliser la création avec gestion des erreurs et répétitions.
6. Ajouter la priorité persistante et le tri.
7. Mettre en place la protection d’accès et finaliser les contrôles serveur.
8. Exécuter la recette, corriger, documenter et préparer le déploiement.

Le chiffrage et le calendrier restent à établir après choix du mécanisme d’accès et de l’hébergement. La fonctionnalité est livrée quand les tests de recette sont satisfaits et que Doztra peut réaliser les trois opérations sur l’environnement prévu.

## 12. Décisions restant à confirmer
| Décision | Proposition de départ |
|---|---|
| Qui utilise l’application ? | Équipe interne Doztra uniquement |
| Coordonnées obligatoires ? | Non ; nom, objet et description obligatoires |
| Retirer une priorité ? | Oui |
| Accès | Identité d’entreprise existante ou accès privé géré |
| Hébergement et budget | À définir avant déploiement |
| Identité visuelle | Nom Doztra, thème clair ; logo/couleur à fournir |
| Conservation des données | Durée à définir avant exploitation réelle |
| Modification/suppression | Reportées à une version suivante |

## 13. Références techniques
Documentation consultée le 21 octobre 2026 :
- Next.js : https://nextjs.org/docs
- Écritures et Server Actions : https://nextjs.org/docs/app/getting-started/mutating-data
- shadcn/ui : https://ui.shadcn.com/docs

Les choix de champs, limites, tri, pagination, modèle de données et critères de recette sont des propositions propres au projet Doztra ; ils ne sont pas imposés par ces documentations.

