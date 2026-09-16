import { createOpenAI } from "@ai-sdk/openai";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { Agent, getAgentByName, routeAgentRequest } from "agents";
import { createChatSdkState } from "agents/chat-sdk";
import { ThinkMessengerStateAgent } from "@cloudflare/think/messengers";
import { Chat } from "chat";
import type { Thread } from "chat";
import { generateText } from "ai";

export { ThinkMessengerStateAgent };

const DISCORD_WEBHOOK_PATH = "/api/webhooks/discord";

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function configuredModels(env: Env): string[] {
  return (env.NINE_ROUTER_ALLOWED_MODELS ?? env.NINE_ROUTER_MODEL)
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function router(env: Env) {
  return createOpenAI({
    apiKey: env.NINE_ROUTER_API_KEY,
    baseURL: env.NINE_ROUTER_BASE_URL
  });
}

export class DiscordBotAgent extends Agent<Env> {
  private bot?: Chat;
  private startupError?: Error;

  onStart(): void {
    try {
      const discord = createDiscordAdapter({
        botToken: this.env.DISCORD_BOT_TOKEN,
        publicKey: this.env.DISCORD_PUBLIC_KEY,
        applicationId: this.env.DISCORD_APPLICATION_ID
      });
      const userName = "9router-bot";
      this.bot = new Chat({
        userName,
        adapters: { discord },
        state: createChatSdkState({ agent: ThinkMessengerStateAgent }) as unknown as ConstructorParameters<
          typeof Chat
        >[0]["state"],
        concurrency: { strategy: "burst", debounceMs: 500 }
      });

      this.bot.onNewMention(async (thread, message) => {
        await this.reply(thread, message.text.replace(/<@!?\d+>/g, "").trim());
      });

      this.bot.onDirectMessage(async (thread, message) => {
        await this.reply(thread, message.text);
      });
    } catch (error) {
      this.startupError = error instanceof Error ? error : new Error(String(error));
    }
  }

  private async reply(thread: Thread, text: string): Promise<void> {
    if (!text) {
      await thread.post("پیامت را همراه با منشن یا متن ارسال کن.");
      return;
    }

    const modelName = this.env.NINE_ROUTER_MODEL;
    if (!configuredModels(this.env).includes(modelName)) {
      await thread.post("مدل فعال در فهرست مدل‌های مجاز نیست.");
      return;
    }

    try {
      const result = await generateText({
        model: router(this.env).chat(modelName),
        system: "You are a helpful Persian-speaking assistant. Be concise.",
        prompt: text
      });
      await thread.post(result.text || "پاسخ متنی دریافت نشد.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await thread.post(`خطا در اتصال به مدل: ${message.slice(0, 500)}`);
    }
  }

  async onRequest(request: Request): Promise<Response> {
    if (!this.bot) {
      return json({ error: this.startupError?.message ?? "Bot is not ready" }, 500);
    }
    return this.bot.webhooks.discord(request, {
      waitUntil: (task: Promise<unknown>) => this.ctx.waitUntil(task)
    });
  }
}

async function listModels(env: Env): Promise<Response> {
  const response = await fetch(`${env.NINE_ROUTER_BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${env.NINE_ROUTER_API_KEY}` }
  });
  const body: unknown = await response.json();
  return json({
    ok: response.ok,
    activeModel: env.NINE_ROUTER_MODEL,
    allowedModels: configuredModels(env),
    router: body
  }, response.ok ? 200 : 502);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return json({
        name: "Discord 9Router bot",
        discordWebhook: DISCORD_WEBHOOK_PATH,
        modelsEndpoint: "/api/models",
        activeModel: env.NINE_ROUTER_MODEL
      });
    }
    if (request.method === "GET" && url.pathname === "/api/models") {
      try {
        return await listModels(env);
      } catch (error) {
        return json({ error: error instanceof Error ? error.message : String(error) }, 502);
      }
    }
    if (request.method === "POST" && url.pathname === DISCORD_WEBHOOK_PATH) {
      const agent = await getAgentByName(env.DiscordBotAgent, "default");
      return agent.fetch(request);
    }
    return (await routeAgentRequest(request, env)) ?? new Response("Not found", { status: 404 });
  }
} satisfies ExportedHandler<Env>;
