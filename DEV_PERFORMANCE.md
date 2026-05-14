# Local Dev Performance — Local MongoDB

The dev backend points at MongoDB Atlas by default. Atlas runs in AWS
`eu-west-3` (Paris); from Egypt that's ~80ms RTT per query and that
round-trip is the biggest single source of dev-time latency.

This doc covers running a local MongoDB mirror so dev queries become
~1ms instead of ~80ms.

## Measured impact (2026-05-14)

| Endpoint                  | Atlas (eu-west-3) | Local docker | Speedup |
| ------------------------- | ----------------- | ------------ | ------- |
| `/products?limit=12` cold | ~180ms            | **40ms**     | 4.5x    |
| `/products?limit=12` warm | ~80ms             | **20ms**     | 4x      |
| `/home-feed` cold         | ~180ms            | **50ms**     | 3.6x    |
| `/home-feed` warm (LRU)   | ~80ms             | **5ms**      | 16x     |

## 1. Start the local mongo

```bash
docker compose -f docker-compose.dev.yml up -d
```

Starts `mongo:7` on `localhost:27017` with a named volume so data
survives restarts.

## 2. Mirror Atlas → local (one-time)

You do **not** need to install mongo-tools on the host. Run them
inside a temporary `mongo:7` container with `--network host`:

```bash
mkdir -p /tmp/atlas-dump
chmod 777 /tmp/atlas-dump

# Replace ATLAS_URI with backend/.env MONGO_URI before switching it locally.
ATLAS_URI="mongodb+srv://USER:PASS@CLUSTER/DBNAME"

docker run --rm --network host \
  -v /tmp/atlas-dump:/dump \
  --user $(id -u):$(id -g) \
  mongo:7 mongodump --uri="$ATLAS_URI" --out=/dump

docker run --rm --network host \
  -v /tmp/atlas-dump:/dump \
  --user $(id -u):$(id -g) \
  mongo:7 mongorestore --uri="mongodb://localhost:27017" --drop /dump
```

## 3. Point the backend at local Mongo

In `backend/.env`, comment the Atlas URI and uncomment:

```
MONGO_URI=mongodb://localhost:27017/belgomla
```

Restart the backend. You should see `✅ MongoDB Connected: localhost`.

## 4. Switching back to Atlas

Re-comment the local URI and uncomment the Atlas one in
`backend/.env`:

```text
MONGO_URI=mongodb+srv://USER:PASS@CLUSTER/DBNAME
```

No data migration needed — local stays as a stale snapshot until you
next dump.

## Atlas region note

Cluster `belgomlacluster.hrqooag.mongodb.net` resolves to AWS
`eu-west-3` (Paris). The closest region to Egypt that MongoDB Atlas
supports is **AWS `me-south-1` (Bahrain)** — would roughly halve prod
TTFB. Migration is a live failover on M10+ tiers. Future task; no
change made.
