# mc-webapp — OpenChamber project notes

## What this is

A basic Bunny Magic Containers demo that proves:

1. Astro + Hono + SQLite + a persistent volume work in one container.
2. The route table in `lobe_hub/AGENTS.md` and the Bunny registry conventions
   from the click-up reference doc still apply.

## Stack recap

- Single container, `runtimeType: shared`, LA region, Anycast endpoint.
- Image: `node:24-alpine` based. App code is baked in at build time.
- Volume: a `main` volume is mounted at `/data` inside the container.
  - `/data/app.db` — SQLite file.
  - `/data/uploads/` — uploaded files.

## Local data shape

When running outside Bunny, data lives at `./data/app.db` and `./data/uploads/`.
These map directly to the volume mount on Bunny.

## Deployment status

- Code scaffolded locally (this dir, 2026-09-17).
- Local smoke test verified end-to-end (CRUD + file upload) on `npm start`.
- Dockerfile + .dockerignore added 2026-09-17.
- No Docker CLI on this host — image must be built externally.

## External build (run on a host with Docker)

The host must be able to push to a registry that Bunny can read. The two simplest:

### Option A — push to GitHub Container Registry (ghcr.io, Bunny registry id `1156`)

```bash
# On the build host (Linux/macOS with docker)
cd /path/to/mc-webapp    # copy/sync from Google Drive

docker build -t mc-webapp:v0.1.0 .
docker tag mc-webapp:v0.1.0 ghcr.io/seanvosler/mc-webapp:v0.1.0

# GitHub: Settings -> Developer settings -> Personal access tokens -> Tokens (classic)
# Token needs `write:packages` scope.
echo "$GH_TOKEN" | docker login ghcr.io -u seanvosler --password-stdin
docker push ghcr.io/seanvosler/mc-webapp:v0.1.0
```

### Option B — push to DockerHub (Bunny registry id `1155`)

```bash
docker build -t mc-webapp:v0.1.0 .
docker tag mc-webapp:v0.1.0 docker.io/seanvosler/mc-webapp:v0.1.0

# DockerHub account already exists?
echo "$DOCKERHUB_TOKEN" | docker login docker.io -u seanvosler --password-stdin
docker push docker.io/seanvosler/mc-webapp:v0.1.0
```

### After the push

Report the image reference back to the agent. Two pieces of info needed:

1. **Full image reference**, e.g. `ghcr.io/seanvosler/mc-webapp:v0.1.0` or
   `docker.io/seanvosler/mc-webapp:v0.1.0`.
2. **Repository id** — `1156` for ghcr.io, `1155` for DockerHub.

The agent will then:

1. Call `POST /registries/digest` to fetch the SHA256 digest and pin the
   deployment.
2. Create the Bunny App via `POST /apps` with one container, `runtimeType:
   shared`, LA region, Anycast endpoint, volume `main` mounted at `/data`.
3. `POST /apps/{id}/deploy` and verify Active with the dashboard-deployed
   smoke test pattern (see bunny-container-setup skill).

## Bunny app metadata (when we deploy)

- App name: `mc-webapp` (or similar)
- Region: `LA`, Anycast endpoint
- Container: single template named `webapp`, port 8080
- Volumes: `main` mounted at `/data`
- Image: TBD (see deployment options)

## Secrets + credentials

- Bunny API: handled by `bunny` wrapper at `/Users/seanvosler/.local/bin/bunny` —
  do not curl `api.bunny.net` directly; `~/.config/bunny/**` is read-restricted.
- No secrets required for this app's first deploy.
