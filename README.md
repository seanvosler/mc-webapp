# mc-webapp

A basic Bunny Magic Containers demo: Astro + Hono + SQLite, single container, persistent volume.

## Stack

- **Runtime:** Node 24 (`node:24-alpine` base image)
- **Frontend:** Astro 5, server output, `@astrojs/node` adapter (standalone)
- **API:** Hono 4 mounted at `/api/*` via Astro middleware
- **Database:** SQLite via `@libsql/client` (pure JS, no native build required)
- **Storage:** filesystem under `/data` (mounted as a Bunny volume)

## Local development

```bash
npm install
npm run dev          # dev server on :8080
npm run build
npm start            # production server on :8080
```

Data is stored under `./data/app.db` and `./data/uploads/`. Both paths default to
relative `./data/...` and may be overridden via `DATABASE_URL` (libSQL URL) and
`UPLOADS_DIR` env vars.

## Routes

- `/` — landing
- `/notes` — create/edit/delete notes (SQLite)
- `/files` — upload/serve files (filesystem)
- `/api/health` — JSON heartbeat
- `/api/notes` — list/create notes
- `/api/notes/:id` — update/delete note
- `/api/files` — list/upload files
- `/api/files/:name` — serve a single file

## Deployment (Bunny Magic Containers)

This app is built and shipped as a container image, then pulled by Bunny from a
public registry. The Dockerfile is checked in; the actual `docker build` and
`docker push` happen on a host that has Docker installed.

```bash
docker build -t mc-webapp:v0.1.0 .
docker tag mc-webapp:v0.1.0 <registry>/<repo>:v0.1.0   # ghcr.io or docker.io
docker login <registry>
docker push <registry>/<repo>:v0.1.0
```

Full external-build commands (with token handling) are in `AGENTS.md` →
"External build". After the push, tell the agent the image reference and which
Bunny registry id (`1155` DockerHub, `1156` ghcr.io, `9808` Bunny).

The Bunny app then runs:

- `runtimeType: shared`, LA region, Anycast endpoint, single container on port 8080.
- Volume `main` mounted at `/data` (persists `app.db` + `uploads/`).
- Image pulled by digest; healthcheck hits `/api/health`.

## Environment variables

| Name | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./data/app.db` | libSQL connection URL |
| `UPLOADS_DIR` | `./data/uploads` | filesystem target for uploads |
| `PORT` | `8080` | HTTP listen port |
| `HOST` | `0.0.0.0` | HTTP bind host |
