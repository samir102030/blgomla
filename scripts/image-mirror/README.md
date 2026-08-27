# image-mirror

An independent second copy of every picture the shop renders, held on this
repository's own **`images`** branch.

## Why it exists

The catalogue's photographs were hot-linked to the shops they were scraped
from, and that is not a hypothetical risk: 139 department pictures on
free-electronic.com were deleted at the source before anyone copied them, and
no migration will bring those back. The product photographs were rescued in
time and now sit on our own Cloudinary.

Which leaves one copy of seventeen thousand pictures, on one account, with one
company. A suspended account, an exceeded free tier, a mistaken bulk delete in
the media library — any of those and the catalogue is bare, and the originals
are on shops that have already proven they delete things.

## Why a branch and not a folder

The mirror is about a gigabyte and a half across some seventeen thousand
files. On `main` every Vercel deployment would clone it, and under
`frontend/public/` it would be copied into the bundle as well. On its own
branch none of that happens — Vercel shallow-clones `main` and never sees it —
while GitHub still holds it and jsDelivr still serves it:

```
live    https://res.cloudinary.com/<cloud>/image/upload/v178…/belgomla/products/6a84db…-0.webp
mirror  files/belgomla/products/6a84db…-0.webp
CDN     https://cdn.jsdelivr.net/gh/samir102030/blgomla@images/files/belgomla/products/6a84db…-0.webp
```

Nothing is hashed, sharded or renamed on the way. That matters more than the
tidiness of the folder: `frontend/src/lib/imageBackup.ts` has to turn a live
URL into a mirror URL at the moment an image fails to load, and a plain prefix
swap is a regex it can hold by itself.

**These scripts live on `main`** — a scheduled workflow only runs from the
default branch — and write into a checkout of `images` passed with `--out`.

## The weekly job

`.github/workflows/image-backup.yml`, Sundays 03:00 UTC (06:00 Cairo), plus
**Actions → Backup catalogue images → Run workflow** on demand. It needs no
secret: the catalogue API is public and the job uses the default
`GITHUB_TOKEN`, which can write to this repository and nothing else.

## Running it by hand

```bash
node scripts/image-mirror/backup.mjs --out ../blgomla-images --dry-run
node scripts/image-mirror/backup.mjs --out ../blgomla-images
node scripts/image-mirror/backup.mjs --out ../blgomla-images --refresh
```

Safe to stop and re-run: a file already on disk is not fetched again, and
nothing is ever deleted — a picture that vanishes from the catalogue stays in
the mirror, because "removed from the shop" and "gone forever" are not the same
event and only one of them is reversible.

## Putting it back

The half of a backup that is usually missing. Because each picture is filed
under its Cloudinary public id, a restore is not a migration: the same bytes go
up under the same id, every address already stored on every product keeps
working, and the database is never touched.

```bash
export CLOUDINARY_URL='cloudinary://<key>:<secret>@<cloud>'
node scripts/image-mirror/restore.mjs --from ../blgomla-images --dry-run
node scripts/image-mirror/restore.mjs --from ../blgomla-images --missing-only
```

## What the mirror branch holds

| | |
|---|---|
| `files/` | the pictures, under their Cloudinary public ids |
| `external/` | pictures still hot-linked elsewhere, named by a hash of the address |
| `manifest.json` | every picture: path, source, size, sha256, and where in the API it was found |
| `summary.json` | the numbers from the last run |
| `GONE.md` | pictures the source no longer serves — and which of them this mirror is now the only copy of |
| `failed.json` | what failed last run; the next run retries it |

## Known limits

- **Hidden and draft products** are not in the public API, so they are not
  swept. Add a repository secret `BELGOMLA_TOKEN` with an admin token and the
  script picks it up automatically.
- **Pictures still hot-linked to vendor sites** may be unreachable from the
  runner — those hosts refuse data centres via Cloudflare. What comes through
  is saved under `external/`; what does not is recorded in `GONE.md`.
- **Size.** Expect 1–1.5 GB. GitHub warns past 1 GB and hard-limits at 5 GB, so
  there is room. If the catalogue grows far beyond this, the next step is
  Cloudflare R2 (10 GB free, no egress fees).
