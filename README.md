# Orders API — NestJS + MongoDB (Mongoose)

API pédagogique construite étape par étape pour pratiquer NestJS + MongoDB (Mongoose) avec un focus sur :

- aggregation pipelines MongoDB
- indexation et preuves chiffrées de performance
- pagination cursor (seek)
- multi-tenant simulation (guard)
- gestion d’erreurs Mongo (E11000 -> 409)
- tests E2E (Jest + Supertest)

---

## 1) Architecture NestJS (rappels)

- **Controller** : expose les routes HTTP.
- **Service** : logique métier (create/list/stats).
- **DTO** (Data Transfer Object) : classes qui décrivent/valident les payloads (`@Body()`, `@Query()`).
- **ValidationPipe** (global) :
  - `whitelist: true` : supprime les champs non déclarés dans le DTO.
  - `forbidNonWhitelisted: true` : renvoie 400 si le client envoie un champ non attendu.
  - `transform: true` : convertit les types (ex. query `limit=5` -> `number`) si le DTO le demande.

Point clé : `transform: true` fonctionne avec `@Type(() => Number)` (class-transformer) sur les champs numériques des DTO.

---

## 2) Modèle de données MongoDB (Mongoose)

Collection : `orders`

Champs principaux :

- `tenantId` (isolation multi-tenant)
- `userId`
- `status` : `DRAFT | PAID | CANCELLED`
- `items[]` : `{ sku, price, qty }`
- `total` : calculé côté backend (ne pas faire confiance au client)
- `createdAt/updatedAt` via `timestamps: true`

Point clé : avec `timestamps: true`, `createdAt` est ajouté automatiquement.

---

## 3) Aggregation pipelines MongoDB (stages)

MongoDB aggregation = enchaînement d’étapes exécutées **dans l’ordre**.

- `$match` : filtre (équivalent WHERE). **Critique pour la perf**.
- `$project` : garde/transforme les champs.
- `$group` : agrège (sum/count/etc.).
- `$unwind` : “explose” un tableau -> 1 doc par élément.
- `$sort` : tri.
- `$limit` : limite de résultats.

### Daily stats

Objectif : revenu + count par jour.

- regroupement par jour via `$dateTrunc`
- somme de `total` + comptage.

Robustesse : filtrer les docs incohérents :

- `$match: { total: { $type: "number" } }`

### Top-items

Objectif : stats par SKU (qty, revenue, lines).

- `$unwind: "$items"` pour transformer 1 order (plusieurs items) en 1 doc par item.
- `$group` par `items.sku`.
- `lines = $sum: 1` = nombre de lignes d’items (différent de `qty`).

Robustesse :

- `$match: { items: { $type: "array" } }` avant `$unwind` pour éviter les 500 sur données “sales”.

---

## 4) Indexation MongoDB et performance

Un index MongoDB est stocké sous forme d’**arbre équilibré (B-tree)**.
Effet : trouver une clé/plage de clés en **log(N)** au lieu de scanner N documents.

Pour prouver la perf, on utilise :

- `explain("executionStats")`
- métriques clés :
  - `totalDocsExamined`
  - `totalKeysExamined`
  - `indexName` (quel index a gagné)
- `hint()` pour forcer un index (benchmark/debug), pas pour du code prod par défaut.

---

## 5) Preuves chiffrées “avant / après” (explain + hint)

On a généré un dataset de “bruit” (beaucoup d’orders récents non matchants) pour rendre l’impact visible.

### A) Listing (find + sort + limit)

Requête : filtre `{tenantId,userId,status}` + tri `createdAt desc` + `limit 20`

- Avant (forcer `createdAt_1`) :
  - `totalDocsExamined ≈ 2020`
  - `totalKeysExamined ≈ 2020`
- Après (index composé optimal) :
  - `totalDocsExamined = 20`
  - `totalKeysExamined = 20`

Index optimal :

- `{ tenantId: 1, userId: 1, status: 1, createdAt: -1 }`
  Concept clé : **index qui couvre filtre + sort + limit** => lecture directe + arrêt au limit.

### B) Pipeline top-items

Même logique : la perf dépend surtout du `$match` (premier stage) et de son index.

- Avant (scan brut) : `totalDocsExamined = 2101`
- Après (index `{tenantId,status,createdAt}`) : `totalDocsExamined = 101`

Conclusion : plus tôt `$match` filtre et plus il est indexable, moins `$unwind/$group` traitent de docs.

---

## 6) Pagination cursor (seek pagination)

Deux types :

### Offset pagination (skip)

- `skip + limit`
- perf se dégrade quand on va loin (skip coûte cher)
- instable si de nouveaux docs arrivent (doublons/sauts)

### Cursor pagination (seek)

- tri déterministe `(createdAt desc, _id desc)`
- cursor = `{cursorCreatedAt, cursorId}` (dernier élément de la page précédente)
- condition de reprise :
  - `createdAt < cursorCreatedAt`
  - OR (`createdAt == cursorCreatedAt` AND `_id < cursorId`)
- perf quasi constante et stable.

Index dédié :

- `{ tenantId: 1, userId: 1, status: 1, createdAt: -1, _id: -1 }`

Endpoint :

- `GET /orders/cursor` -> retourne `{ page, nextCursor }`

---

## 7) Multi-tenant simulation (Guard)

On a simulé un contexte multi-tenant via un header :

- `x-tenant-id`

### Pourquoi un guard ?

- Un tenant ne doit pas venir du body/query (sinon contournement de l’isolation).
- Un **Guard** est le mécanisme standard pour autoriser/refuser une requête avant d’entrer dans le handler.

On a :

- `TenantGuard` qui lit `x-tenant-id`
- injection dans `req.tenantId`
- suppression de `tenantId` des DTO publics (ou rendu non utilisable) et injection côté serveur.

Typage propre (sans `any`) :

- `TenantRequest = Request & { tenantId: string }` (intersection type `&`)
- `import type` pour `TenantRequest` dans les signatures décorées quand `isolatedModules` + `emitDecoratorMetadata` sont activés.

---

## 8) Gestion d’erreurs Mongo : E11000 -> 409

- Ajout d’un index unique réaliste : `(tenantId, orderRef)`
- `orderRef` sert d’identifiant métier unique par tenant
- index unique partiel possible (`partialFilterExpression`) pour éviter de casser les anciens docs.

Quand Mongo renvoie `E11000 duplicate key` :

- on mappe vers HTTP **409 Conflict** via un Exception Filter.

Point clé : ne pas faire un `@Catch()` catch-all. Le filter doit catcher les erreurs Mongo uniquement, sinon il perturbe les erreurs Nest (ValidationPipe etc.).

---

## 9) Tests E2E : Jest + Supertest

**Supertest** envoie des requêtes HTTP vers `app.getHttpServer()` (sans port réseau).
On valide :

- guard (header manquant -> 400/401)
- create order
- cursor pagination
- daily stats
- top-items

Piège important résolu :

- En E2E, `main.ts` n’est pas exécuté.
- Donc les global pipes/filters/interceptors définis dans `main.ts` doivent être enregistrés aussi dans le bootstrap E2E (beforeAll), sinon `transform: true` ne s’applique pas et `limit` reste string, ce qui casse `$limit`.

Bon pattern :

- `setupApp(app)` partagé entre `main.ts` et les tests E2E pour éviter les divergences.

---

## Glossaire (termes clés)

- DTO : classe de validation/typing pour les entrées HTTP.
- ValidationPipe : applique validation + whitelist + transform.
- Aggregation pipeline : suite de stages Mongo ($match/$group/$unwind…).
- Index composé : index sur plusieurs champs dans un ordre donné.
- `explain("executionStats")` : métriques réelles d’exécution (docs/keys examinés).
- `hint()` : force un index pour benchmark/debug.
- Cursor pagination (seek) : pagination basée sur des valeurs triées (createdAt/\_id).
- Guard : contrôle d’accès avant handler (idéal pour tenant/auth).
