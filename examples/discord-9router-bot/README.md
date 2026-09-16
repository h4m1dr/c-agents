# Discord 9Router Bot

A Cloudflare Worker bot built with Agents SDK, Chat SDK, Discord, and an OpenAI-compatible 9Router endpoint.

Current project version: `v0.2`

## Implemented in v0.2

Phase 1 of the multi-agent architecture is complete:

- `src/tools/` is the central tool registry location.
- `src/departments/` contains the initial `General` department.
- `src/router/` contains the default department resolver.
- Department system prompts are passed to the model.
- Tool schemas are added to the AI SDK request only when a department has tools.
- Tool calls are detected and logged, with a temporary Discord response until
  the Phase 5 execution loop is implemented.
- `execute_code_sandbox` calls the public Piston API.
- `read_github_file` reads and UTF-8 decodes GitHub repository files.
- `search_web` calls Tavily and returns an answer or serialized results.
- All tools use native Workers `fetch` and return failures as strings.
- `/research`, `/devops`, and `/admin` select a department explicitly.
- The selected prefix is removed before the prompt is sent to the model.
- Messages without a prefix fall back to the Admin department.
- The AI SDK executes tool calls for up to five steps and preserves the tool
	conversation context between steps.
- Tool execution failures are returned to the model as text so it can recover.

The current router is prefix-based. Model-based smart routing and a durable
storage-backed department memory are planned for later phases.

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
wrangler secret put GITHUB_PAT
wrangler secret put TAVILY_API_KEY
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
