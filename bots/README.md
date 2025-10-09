# Docker Discord Bot

This project provides a Discord bot that controls the Docker Management API (located in `../apps`). The bot:

- Loads all slash commands from `src/commands` automatically.
- Presents an interactive UI (embeds, dropdowns, buttons, modal) to start/stop docker entries.
- Queries the existing REST API to show docker status and statistics.

## Prerequisites

- Node.js 20 or later.
- A running instance of the Docker Management API.
- Discord application and bot token.

## Installation

```bash
cd bots
npm install
```

## Environment Variables

Create a `.env` file inside the `bots` directory with:

```
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=application_id
# Optional: use during development for instant updates
DISCORD_GUILD_ID=guild_id

# Docker Management API configuration
DOCKER_API_BASE_URL=http://localhost:4000/api
# Optional: bearer token header
# DOCKER_API_KEY=your_api_key
```
> RCON: Docker entries must have `rconport` and `rconpassword` configured for stop/command actions to work.

## Usage

1. Register slash commands (repeat when commands change):
   ```bash
   npm run register
   ```
   Guild registration is used when `DISCORD_GUILD_ID` is set, otherwise commands are registered globally.

2. Run the bot:
   ```bash
   npm run dev      # ts-node (development)
   # or
   npm run build
   npm start        # run compiled JavaScript
   ```

### Available Commands

- `/docker manage` - opens an interactive view with docker selection, action buttons, and auto-refresh.
- `/docker status name:<docker-name>` - shows detailed information for the specified entry.
- `/docker command name:<docker-name> input:<text>` - sends a raw command to the container STDIN and echoes stdout/stderr.
- `/ping` - quick heartbeat check for the bot.

## Project Structure

- `src/config/env.ts` – environment loader and validation.
- `src/services/dockerApi.ts` – REST client for the Docker Management API.
- `src/components/*` – UI helpers (embeds, menus, buttons, modal).
- `src/services/dockerInteractions.ts` – handlers for interactive components.
- `src/commands/*` – slash command implementations.
- `src/index.ts` – bot bootstrap.

## Notes

- The bot assumes the Docker Management API is reachable before performing actions.
- Re-run `npm run register` after adding or modifying commands so Discord picks up the changes.
