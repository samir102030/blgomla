# the mirror

This branch is not code. It holds an independent second copy of every
photograph the shop renders — about seventeen thousand files — kept up to date
by `.github/workflows/image-backup.yml` on `main`, every Sunday.

It is a branch rather than a folder on `main` for one reason: at a gigabyte and
a half, every Vercel deployment would otherwise clone it. Here the build never
sees it, while GitHub still holds it and jsDelivr still serves it:

```
https://cdn.jsdelivr.net/gh/samir102030/blgomla@images/files/<cloudinary public id>
```

Nothing here is hand-edited, and nothing is ever deleted: a picture that
disappears from the catalogue stays, because "removed from the shop" and "gone
forever" are not the same event and only one of them is reversible.

| | |
|---|---|
| `files/` | the pictures, under their Cloudinary public ids |
| `external/` | pictures still hot-linked elsewhere, named by a hash of the address |
| `manifest.json` | every picture: path, source, size, sha256, where it was found |
| `summary.json` | the numbers from the last run |
| `GONE.md` | pictures the source no longer serves — and which of them this is now the only copy of |
| `failed.json` | what failed last run; the next run retries it |

The scripts, and how to restore from this, are on `main` under
`scripts/image-mirror/`.
