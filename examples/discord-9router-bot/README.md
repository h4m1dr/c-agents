# Discord 9Router Bot

A Cloudflare Worker bot built with Agents SDK, Chat SDK, Discord, and an OpenAI-compatible 9Router endpoint.

## Deploy

1. Create a Discord application and bot in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Set the Interactions Endpoint URL to `https://YOUR_WORKER_DOMAIN/api/webhooks/discord`.
3. From this directory, configure secrets:

```bash
pnpm install
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put DISCORD_PUBLIC_KEY
wrangler secret put DISCORD_APPLICATION_ID
wrangler secret put NINE_ROUTER_API_KEY
wrangler secret put NINE_ROUTER_ADMIN_TOKEN
wrangler secret put NINE_ROUTER_BASE_URL
wrangler secret put NINE_ROUTER_MODEL
wrangler secret put NINE_ROUTER_ALLOWED_MODELS
```

`NINE_ROUTER_BASE_URL` should include `/v1`, for example `https://9r.ykno.ir/v1`. The model endpoint is available at `/api/models` and requires the admin token. The active model must be included in the allowlist.

List models and update the active allowlist:

```bash
curl -H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
	https://YOUR_WORKER_DOMAIN/api/models

curl -X POST https://YOUR_WORKER_DOMAIN/api/models/config \
	-H "Authorization: Bearer $NINE_ROUTER_ADMIN_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"model":"GPT","allowedModels":["GPT","Qwen-3.7"]}'
```

Deploy with:

```bash
pnpm run deploy
```

Invite the bot to a server with the `bot` and `applications.commands` scopes. Mention it or send it a direct message.

## Local development

```bash
cp .env.example .dev.vars
pnpm run dev
```

Discord requires a public HTTPS endpoint. Use a Cloudflare Quick Tunnel while developing and set its URL as the Discord Interactions Endpoint.
