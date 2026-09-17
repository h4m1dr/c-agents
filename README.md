# h4m1dr Agents

A Discord multi-agent assistant running on Cloudflare Workers, Durable Objects, and an OpenAI-compatible 9Router endpoint.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/hrstorage9762/agents/tree/main/examples/discord-9router-bot)

> This repository is a personal fork of [Cloudflare Agents](https://github.com/cloudflare/agents), focused on the deployable bot in [`examples/discord-9router-bot`](examples/discord-9router-bot).

## Overview

The bot turns Discord messages into bounded, tool-enabled agent runs. Each message is routed to a department, enriched with that department's system prompt and tools, sent through 9Router, and answered back in Discord.

```text
Discord
  -> Chat SDK webhook
  -> Cloudflare Worker + Durable Object
  -> Department router
  -> 9Router / OpenAI-compatible model
  -> Tool execution (when requested)
  -> Discord response
```

## Features

- Discord mentions and direct-message handling through the official Chat SDK adapter
- OpenAI-compatible model routing through 9Router
- Department prefixes: `/research`, `/devops`, and `/admin`
- Prefix stripping before the request reaches the model
- Research, DevOps, and Admin personas with department-specific tools
- Bounded AI SDK tool-calling loop with a maximum of five steps
- Web search through Tavily
- Code execution through the public Piston API
- GitHub repository file reading through the GitHub REST API
- GitHub file create/update commits through the GitHub Contents API
- Durable Object SQLite memory for recent conversation and tool events
- Discord signature verification through `DISCORD_PUBLIC_KEY`
- Bearer-token protection for model administration endpoints
- Structured Cloudflare logs for routing, model completion, and tool execution
- No VPS or always-on server required

## Current Scope

The current implementation is a strong prototype and production foundation, but it is intentionally explicit about its boundaries:

- Routing is prefix-based; model-driven supervisor routing is not enabled yet.
- GitHub commit automation updates a single file through the GitHub Contents API; arbitrary branch workflows are not included.
- The AI SDK and Chat SDK manage tool execution and webhook lifecycle. A custom raw Discord `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE` flow is not used.
- Raw AI SDK response messages, including assistant tool calls and tool results, are persisted in SQLite and reused as structured conversation memory.

## Deploy to Cloudflare

The button at the top of this page opens Cloudflare's deployment flow for the bot example. For a manual deployment:

```bash
cd examples/discord-9router-bot
pnpm install
pnpm run deploy
```

### Required secrets

```bash
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put NINE_ROUTER_API_KEY
wrangler secret put NINE_ROUTER_ADMIN_TOKEN
wrangler secret put GITHUB_PAT
wrangler secret put TAVILY_API_KEY
```

The non-secret model defaults live in [`wrangler.jsonc`](examples/discord-9router-bot/wrangler.jsonc):

```text
NINE_ROUTER_BASE_URL=https://9r.ykno.ir/v1
NINE_ROUTER_MODEL=GPT
NINE_ROUTER_ALLOWED_MODELS=GPT
```

Never commit API keys, bot tokens, or personal access tokens.

## Discord Setup

1. Create an application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Copy the bot token, application ID, and public key into Cloudflare secrets.
3. Set the Interactions Endpoint URL to:

   ```text
   https://YOUR_WORKER_DOMAIN/api/webhooks/discord
   ```

4. Invite the bot with the `bot` and `applications.commands` scopes.
5. Enable Message Content Intent if the bot must receive ordinary channel messages.
6. Mention the bot or send it a direct message.

The adapter validates Discord request signatures before dispatching events to the bot handlers.

## Model Administration

List the models exposed by the configured Router:

```bash
curl \
  -H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
  https://YOUR_WORKER_DOMAIN/api/models
```

Change the active model and allowlist:

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/api/models/config \
  -H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"GPT","allowedModels":["GPT","Qwen-3.7"]}'
```

The active model must be included in `allowedModels`.

## Department Commands

```text
/research summarize the latest Workers Durable Objects guidance
/devops inspect the repository structure
/admin run the best available tool for this request
```

Messages without a prefix use the Admin department. Tool execution is bounded to five AI SDK steps to prevent runaway loops.

## Local Development

```bash
cd examples/discord-9router-bot
pnpm install
cp .env.example .dev.vars
pnpm run dev
```

Discord requires a public HTTPS endpoint. Use a Cloudflare Quick Tunnel during local development and configure its URL in the Discord Developer Portal.

View deployed logs with:

```bash
wrangler tail discord-9router-bot
```

## Project Structure

```text
examples/discord-9router-bot/
├── src/
│   ├── departments/       # Researcher, DevOps, and Admin personas
│   ├── router/            # Prefix-based department selection
│   ├── tools/             # Tool schemas and Workers fetch implementations
│   ├── types.ts           # Shared tool and department contracts
│   └── index.ts            # Worker entrypoint, Durable Object, and memory
├── .env.example           # Local variable template without real secrets
├── wrangler.jsonc         # Worker, Durable Object, SQLite, and vars config
└── README.md              # Bot-specific setup guide
```

## Free-Tier Notes

The Worker does not require a VPS and is suitable for personal, low-volume use on a Cloudflare account where Durable Objects with SQLite are available. Cloudflare limits, Discord limits, and 9Router/model quotas are separate. Tavily and public Piston also have their own availability and rate limits.

## Security

- Rotate any 9Router token that has ever been exposed.
- Store credentials with `wrangler secret put`; do not place them in `vars` or source files.
- Keep the admin token private and send it only in the `Authorization` header.
- Use `wrangler tail` carefully and avoid logging sensitive prompts or tool arguments.

## License and Upstream

This fork follows the licensing and upstream project context of [cloudflare/agents](https://github.com/cloudflare/agents). The custom bot implementation and documentation are maintained for the h4m1dr deployment.
