# Agent Notes

This repository hosts the Docker Management API (TypeScript/Express + Prisma). Use the following checklist when making automated changes or validations.

## Project Layout

- `src/` – application source (Express app, services, Prisma integration, WebSocket gateway).
- `prisma/` – schema and migrations.
- `generated/prisma/` – Prisma client output (keep in sync with `schema.prisma`).
- `README.md` – setup details and endpoint summary.

## Common Commands

```bash
npm install              # install dependencies
npm run prisma:generate  # regenerate Prisma client after schema changes
npm run build            # type-check and compile
npm start                # run compiled server from dist/
npm run dev              # ts-node entry point (development)
```

`npm run build` doubles as the quickest smoke check because type errors fail the build.

## Environment

Key variables:

- `DATABASE_URL` – MySQL connection string.
- `PORT` – API port (default 4000).
- `DOCKER_STATS_INTERVAL_MS` – stats polling frequency (default 10000).
- `DOCKER_CLI`/`DOCKER_COMPOSE_COMMAND` – override docker executables if needed.

## Operational Notes

- Each docker record should reference a compose project where the container name equals `docker.name`. The stop endpoint sends stdin to that container before calling `docker compose down`.
- `dockerStatsService` polls `docker stats` for ACTIVE entries; adjust `DOCKER_STATS_INTERVAL_MS` for noisy environments.
- Log streaming is exposed via WebSocket: `ws://host:port/${DOCKER_LOG_WS_PREFIX}/<docker-name>`.
- Swagger UI is served at `/docs`; JSON spec at `/docs-json`.

## Testing Guidance

- No automated tests yet. Use `npm run build` and, when possible, perform manual endpoint checks (e.g., with curl or Postman) against a sandbox compose project.
- When adding features that affect docker CLI execution, prefer wrapping external commands in `src/utils/docker.ts` to keep behaviour centralized and testable.

