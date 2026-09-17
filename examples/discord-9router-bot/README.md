# Discord 9Router Bot

A Cloudflare Workers bot built with Agents SDK, Chat SDK, Durable Objects, Discord, and an OpenAI-compatible 9Router endpoint.

## Implemented

- Department routing with `/research`, `/devops`, and `/admin`
- Tavily web search, Piston code execution, and GitHub file reading tools
- AI SDK tool-calling loop bounded to five steps
- SQLite Durable Object memory for recent conversation and tool events
- Discord signature verification through the official adapter
- Protected model administration endpoints
- Structured logs for `wrangler tail`

The current router is prefix-based. GitHub commit creation and model-driven smart routing are not implemented yet.

## Deploy

Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications), then set the Interactions Endpoint URL to:

```text
https://YOUR_WORKER_DOMAIN/api/webhooks/discord
```

From this directory:

```bash
pnpm install
```

Set production secrets:

```bash
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put NINE_ROUTER_API_KEY
wrangler secret put NINE_ROUTER_ADMIN_TOKEN
wrangler secret put GITHUB_PAT
wrangler secret put TAVILY_API_KEY
```

`NINE_ROUTER_BASE_URL`, `NINE_ROUTER_MODEL`, and `NINE_ROUTER_ALLOWED_MODELS` are non-secret defaults in `wrangler.jsonc`.

Deploy:

```bash
pnpm run deploy
```

Invite the bot with the `bot` and `applications.commands` scopes. Enable Message Content Intent when ordinary channel messages are required.

## Model Administration

```bash
curl \
  -H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
  https://YOUR_WORKER_DOMAIN/api/models

curl -X POST https://YOUR_WORKER_DOMAIN/api/models/config \
  -H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model":"GPT","allowedModels":["GPT","Qwen-3.7"]}'
```

## Local Development

```bash
cp .env.example .dev.vars
pnpm run dev
```

Discord requires a public HTTPS endpoint. Use a Cloudflare Quick Tunnel for local testing. View production logs with:

```bash
wrangler tail discord-9router-bot
```

## Architecture

```text
Discord
  -> Chat SDK webhook and signature verification
  -> DiscordBotAgent Durable Object
  -> Prefix-based department router
  -> 9Router model request
  -> AI SDK tool loop (up to five steps)
  -> SQLite conversation memory
  -> Discord response
```

## Environment

`.env.example` contains the local variable names without real credentials. Never commit `.dev.vars`, API keys, bot tokens, or personal access tokens.
