# Local Dev Performance — Optional Local MongoDB

The dev backend points at MongoDB Atlas by default. Each query costs a ~80ms
round-trip from your machine to Atlas. For local dev that round-trip is the
biggest single source of latency.

You can run a local MongoDB and dump Atlas into it once. Subsequent dev
queries become ~1ms instead of ~80ms.

## 1. Start a local Mongo

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts `mongo:7` listening on `localhost:27017` with a named volume so
the data survives container restarts.

## 2. Mirror Atlas → local (one-time)

You need the official MongoDB Database Tools (`mongodump` / `mongorestore`).
On Ubuntu:

```bash
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2204-x86_64-100.10.0.deb
sudo dpkg -i mongodb-database-tools-ubuntu2204-x86_64-100.10.0.deb
```

Then dump and restore:

```bash
# Replace ATLAS_URI with the connection string from backend/.env (MONGO_URI)
ATLAS_URI="mongodb+srv://USER:PASS@CLUSTER/prod"

mongodump --uri="$ATLAS_URI" --out=./atlas-dump
mongorestore --uri="mongodb://localhost:27017" --drop ./atlas-dump
```

## 3. Point the backend at local Mongo

Edit `backend/.env`:

```diff
- MONGO_URI=mongodb+srv://.../prod?retryWrites=true&w=majority
+ MONGO_URI=mongodb://localhost:27017/prod
```

Restart the backend. `curl http://localhost:5000/api/products` TTFB should
drop from ~180ms → ~20ms.

## 4. When to switch back

Switch the env back to the Atlas URI when:
- You need to test against real production data
- You want to share state across machines
- You're testing connection-pool / TLS behaviour
