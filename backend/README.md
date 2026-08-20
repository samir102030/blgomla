# Belgomla API

Express, ESM, MongoDB via Mongoose. Runs as a serverless function on Vercel —
`api/index.js` exports the app, and `vercel.json` sends every path to it and
declares the five cron schedules.

## Where it runs

Two Vercel projects from this one repository:

| Project | Root | Serves |
| --- | --- | --- |
| `blgomla` | `frontend` | The storefront, on `blgomla.vercel.app` |
| `blgomla-api` | `backend` | This API |

The storefront rewrites `/api/*` to the API project, so the browser only ever
talks to one origin. That is not cosmetic: the session cookie is set without a
`Domain`, so it belongs to whatever host the browser saw, and a second origin
would put the cookie on the wrong one and sign every customer straight back
out. `VITE_API_URL` is `/api/` for the same reason — a full URL there would go
direct and skip the rewrite.

Both projects skip a build when nothing under their root directory changed. A
commit touching only `frontend/` will not rebuild this one, which is correct
and occasionally surprising.

## Environment

Required — the server will not start without them:

```
MONGO_URI               # MONGODB_URI is accepted too; hosts disagree on the name
JWT_SECRET
JWT_REFRESH_SECRET
SECRET_ENCRYPTION_KEY   # exactly 64 hex characters, or payment credentials cannot be stored
NODE_ENV=production     # anything else sends SameSite=strict cookies, which break sign-in
```

Needed for anything that sends mail — which includes the code new customers
need to verify their account, so in practice all of them:

```
BREVO_API_KEY
FROM_EMAIL
CLIENT_URL              # every link in every email is built from this
```

Optional. Absent, each degrades rather than breaks:

```
GOOGLE_CLIENT_ID        # without it the sign-in button does not render at all
VERCEL_PROJECT_PREFIX   # scopes the CORS wildcard for preview deployments
SUPPORT_WHATSAPP        # where the assistant hands a conversation to a person
ANTHROPIC_API_KEY       # the support assistant answers by rules without it
SUPPORT_MODEL
```

## Scripts

`npm run dev` for nodemon, `npm start` for plain node.

`scripts/` holds one-off maintenance tools — catalogue backup and restore,
category tree rebuilds, import audits. They are run by hand and several of them
write. **`scripts/seed.js` deletes every document in eight collections before
it writes anything.** Read a script before running it against data anyone cares
about.

## Cron schedules

The five jobs in `vercel.json` all run **once a day**, and not because once a
day is right for them. Hobby accounts cap every cron at a single daily run, and
Vercel enforces it by rejecting the whole deployment — a 400 that the dashboard
swallows, so the project simply never produces a deployment and gives no reason
why. Cart recovery wants hourly, the sale scheduler wants every fifteen
minutes, stock alerts want every thirty; on this plan they each get one run.

The times are UTC and deliberately spread out. `sale-scheduler` at 21:00 UTC is
midnight in Cairo, so scheduled sales flip over at the start of the local day.

If any of these need their real frequency, either the account moves to Pro or
an external scheduler calls the same endpoints on the tighter interval.

## Why `routes` and not `rewrites`

`rewrites` are consulted only after Vercel has looked for a real file, and on a
project with no build step every file in this directory *is* a real file. The
first production deploy served `config/db.js`, `utils/supportTools.js` and the
rest of the source as plain JavaScript to anyone who asked, and `/` returned
`server.js`. Nothing secret leaked — `.env` is not in the repository — but the
whole server was readable.

Legacy `routes` replaces Vercel's default routing instead of appending to it.
With no `{"handle": "filesystem"}` entry, every request goes to the function
and no path resolves to a file on disk. Do not convert this block back to
`rewrites` without putting the source somewhere it cannot be served from.

## Image uploads

Three more variables, and the upload route checks for all three before it will
accept anything:

```
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
```

Absent, the dashboard still edits products and the storefront still shows the
images already stored — every image on the site is a URL, and most of them point
at somewhere other than Cloudinary. What breaks is adding a new one: the picker
returns "Image uploads aren't set up on this server yet."
