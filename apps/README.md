# Docker Management API

Backend service for orchestrating docker-compose workloads with Prisma persistence, runtime metrics, and WebSocket log streaming. The API exposes full CRUD management for docker records, starts and stops compose projects, records usage statistics, and mirrors container stdout to dedicated WebSocket channels.

## Features

- CRUD endpoints for docker metadata stored in MySQL via Prisma.
- Run `docker compose up`/`down` for a saved project path and optional compose file.
- Graceful shutdown by piping the stored stop command into container STDIN before running `docker compose down`.
- Background poller that records CPU and memory usage into the `servermonitor` table.
- WebSocket streaming for container logs at `ws://<host>:<port>/<prefix>/<docker-name>`.
- Auto generated OpenAPI docs served at `/docs` (powered by swagger-ui).
- Configurable via `.env`, including CLI overrides and polling interval.
- Automatically provisions helper scripts (`/docker-tools/stop.sh`, `/docker-tools/command.sh`) inside each container when it starts for manual control.

## Requirements

- Node.js 20+
- npm
- Docker Engine and Docker Compose (v2)
- MySQL database reachable via `DATABASE_URL`

## Installation

```bash
cd apps
npm install
npm run prisma:generate
```

Run pending migrations (adjust command if you manage schema manually):

```bash
npm run prisma:migrate
```

## Environment Variables

Define the following in `.env`:

| Key | Description | Default |
| --- | --- | --- |
| `DATABASE_URL` | MySQL connection string | _required_ |
| `PORT` | HTTP port for the API | `4000` |
| `DOCKER_STATS_INTERVAL_MS` | Polling interval for runtime metrics (ms) | `10000` |
| `DOCKER_CLI` | Command used to invoke Docker | `docker` |
| `DOCKER_COMPOSE_COMMAND` | Compose executable | `docker compose` |
| `DOCKER_LOG_WS_PREFIX` | WebSocket base path for logs | `/ws` |
| `DOCKER_STOP_TIMEOUT_SEC` | Seconds Docker waits before force-killing on fallback `docker stop` | `30` |
| `LOG_LEVEL` | Log verbosity (`debug`, `info`, `warn`, `error`) | `info` |

## Running the Service

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

The service listens on `http://localhost:PORT`. Swagger UI is available at `http://localhost:PORT/docs` and the JSON spec at `http://localhost:PORT/docs-json`.

## API Overview

- `GET /api/health` – quick status probe.
- `GET /api/dockers` – list docker entries.
- `POST /api/dockers` – create entry (provide compose path, location, stop command, etc.).
- `GET /api/dockers/:id` – fetch details.
- `PUT /api/dockers/:id` – update metadata.
- `DELETE /api/dockers/:id` – remove entry (must not be running).
- `POST /api/dockers/:id/start` - run compose (`{ "build": true }` optional).
- `POST /api/dockers/:id/stop` - pipe stored stop command to STDIN and tear down compose.
- `POST /api/dockers/:id/restart` - convenience wrapper for stop + start.
- `POST /api/dockers/:id/command` - send a raw command string to the container STDIN.
- `GET /api/dockers/:id/stats` - latest metrics snapshot.
- `GET /api/monitors` - list stored monitoring records.

Refer to Swagger for models and request payloads.

## WebSocket Log Streaming

- URL pattern: `ws://localhost:PORT/PREFIX/<docker-name>` (default prefix `/ws`).
- Emits JSON messages: `{ "channel": "stdout" | "stderr", "data": "<line>" }`.
- Connection closes automatically if the docker name is unknown or logs terminate.

Ensure each compose project sets `container_name` (or equivalent) to match the `docker.name` field so log streaming and PID inspection can resolve the container.

## Metrics Collection

- Background worker samples active containers with `docker stats --no-stream`.
- CPU percentage and memory usage (MiB) are stored in `servermonitor` rows keyed by docker name.
- Tuning: adjust `DOCKER_STATS_INTERVAL_MS` to control poll frequency (default 10s).

## Graceful Stop Flow

1. Update the docker record with the stop command (e.g., `stop` for Minecraft).
2. `POST /api/dockers/:id/stop` sends the command via `docker exec -i <name> sh -c 'cat > /proc/1/fd/0'`.
3. The service waits for the container to report `State.Running = false`. If it remains up, the service falls back to `docker stop --time <DOCKER_STOP_TIMEOUT_SEC>` and waits again.
4. Once the container is down the service executes `docker compose down`.

If the container is still running after the fallback, the API responds with an error.

## Prisma

- Client is generated in `generated/prisma` (already in the repository).
- Customize schema in `prisma/schema.prisma` and regenerate with `npm run prisma:generate` after edits.

## Useful Scripts

- `npm run dev` – start the API with ts-node (ESM).
- `npm run build` – compile TypeScript to `dist/`.
- `npm start` – run compiled JavaScript (requires prior `build`).
- `npm run prisma:generate` – regenerate Prisma client.
- `npm run prisma:migrate` – apply pending migrations.

## Testing

Test suite is not yet implemented. Use `npm run build` to perform a type-check. Consider adding integration tests for docker interactions with mocks or a controlled environment.
