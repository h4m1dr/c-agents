import { createOpenAI } from "@ai-sdk/openai";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { Agent, getAgentByName, routeAgentRequest } from "agents";
import { createChatSdkState } from "agents/chat-sdk";
import { ThinkMessengerStateAgent } from "@cloudflare/think/messengers";
import { Chat } from "chat";
import type { Thread } from "chat";
import { generateText, isStepCount, jsonSchema, tool } from "ai";
import type { ToolSet } from "ai";
import type { ModelMessage } from "ai";
import { routeMessageToDepartment } from "./router";
import type { AgentTool, Department } from "./types";

export { ThinkMessengerStateAgent };

const DISCORD_WEBHOOK_PATH = "/api/webhooks/discord";

function logError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

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

type ModelSettings = {
  baseUrl: string;
  model: string;
  allowedModels: string[];
};

type StoredConversation = {
  messages: ModelMessage[];
};

function router(env: Env, baseUrl: string) {
  return createOpenAI({
    apiKey: env.NINE_ROUTER_API_KEY,
    baseURL: baseUrl
  });
}

function toModelTools(department: Department): ToolSet | undefined {
  if (department.tools.length === 0) {
    return undefined;
  }

  return Object.fromEntries(
    department.tools.map((agentTool: AgentTool) => [
      agentTool.schema.function.name,
      tool({
        description: agentTool.schema.function.description,
        inputSchema: jsonSchema<Record<string, unknown>>(
          agentTool.schema.function.parameters as Parameters<
            typeof jsonSchema
          >[0]
        ),
        execute: async (args) => {
          const toolName = agentTool.schema.function.name;
          console.log(`[ToolExecution] Starting ${toolName}`);
          try {
            const output = await agentTool.execute(args);
            console.log(
              `[ToolExecution] Success ${toolName}; result length: ${output.length}`
            );
            return output;
          } catch (error) {
            console.error(`[ToolExecution] Failure ${toolName}`, error);
            return `Tool execution failed: ${logError(error)}`;
          }
        }
      })
    ])
  );
}

export class DiscordBotAgent extends Agent<Env> {
  private bot?: Chat;
  private startupError?: Error;

  onStart(): void {
    this.sql`
      CREATE TABLE IF NOT EXISTS model_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        base_url TEXT NOT NULL,
        model TEXT NOT NULL,
        allowed_models TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
    this.sql`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        thread_id TEXT PRIMARY KEY,
        messages_json TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `;
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
        state: createChatSdkState({
          agent: ThinkMessengerStateAgent
        }) as unknown as ConstructorParameters<typeof Chat>[0]["state"],
        concurrency: { strategy: "burst", debounceMs: 500 }
      });

      this.bot.onNewMention(async (thread, message) => {
        await this.reply(thread, message.text.replace(/<@!?\d+>/g, "").trim());
      });

      this.bot.onDirectMessage(async (thread, message) => {
        await this.reply(thread, message.text);
      });
    } catch (error) {
      this.startupError =
        error instanceof Error ? error : new Error(String(error));
    }
  }

  private async reply(thread: Thread, text: string): Promise<void> {
    if (!text) {
      await thread.post("پیامت را همراه با منشن یا متن ارسال کن.");
      return;
    }

    const settings = this.readModelSettings();
    const { department, cleanedMessage } = routeMessageToDepartment(
      text,
      this.env
    );
    console.log(`[Router] Message routed to department: ${department.id}`);
    if (!settings.allowedModels.includes(settings.model)) {
      await thread.post("مدل فعال در فهرست مدل‌های مجاز نیست.");
      return;
    }

    try {
      const stored = this.readStructuredConversation(thread.id);
      const messages: ModelMessage[] = [
        ...stored.messages,
        { role: "user", content: cleanedMessage }
      ];
      const result = await generateText({
        model: router(this.env, settings.baseUrl).chat(settings.model),
        system: department.systemPrompt,
        messages,
        stopWhen: isStepCount(5),
        ...(department.tools.length > 0
          ? { tools: toModelTools(department), toolChoice: "auto" as const }
          : {})
      });
      console.log(
        `[LLM] Completed model request; finish reason: ${result.finishReason}`
      );
      if (result.toolCalls.length > 0) {
        console.log(`[LLM] Tool calls executed: ${result.toolCalls.length}`);
      }
      this.persistStructuredConversation(
        thread.id,
        messages,
        result.responseMessages
      );
      await thread.post(result.text || "پاسخ متنی دریافت نشد.");
    } catch (error) {
      console.error("[LLM] Request failed", error);
      const message = logError(error);
      await thread.post(`خطا در اتصال به مدل: ${message.slice(0, 500)}`);
    }
  }

  private readStructuredConversation(threadId: string): StoredConversation {
    const row = this.sql<{ messages_json: string }>`
      SELECT messages_json FROM conversation_messages
      WHERE thread_id = ${threadId} LIMIT 1
    `[0];
    if (!row) return { messages: [] };
    try {
      return { messages: JSON.parse(row.messages_json) as ModelMessage[] };
    } catch (error) {
      console.error("[Memory] Failed to parse conversation messages", error);
      return { messages: [] };
    }
  }

  private persistStructuredConversation(
    threadId: string,
    messages: ModelMessage[],
    responseMessages: readonly ModelMessage[]
  ): void {
    const nextMessages = [...messages, ...responseMessages].slice(-40);
    this.sql`
      INSERT INTO conversation_messages (thread_id, messages_json, updated_at)
      VALUES (${threadId}, ${JSON.stringify(nextMessages)}, ${Date.now()})
      ON CONFLICT(thread_id) DO UPDATE SET
        messages_json = excluded.messages_json,
        updated_at = excluded.updated_at
    `;
  }

  async onRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/models" && request.method === "GET") {
      return this.modelsResponse(request);
    }
    if (url.pathname === "/api/models/config" && request.method === "POST") {
      return this.updateModelSettings(request);
    }
    if (!this.bot) {
      return json(
        { error: this.startupError?.message ?? "Bot is not ready" },
        500
      );
    }
    return this.bot.webhooks.discord(request, {
      waitUntil: (task: Promise<unknown>) => this.ctx.waitUntil(task)
    });
  }

  private readModelSettings(): ModelSettings {
    const row = this.sql<{
      base_url: string;
      model: string;
      allowed_models: string;
    }>`
      SELECT base_url, model, allowed_models
      FROM model_settings
      WHERE id = 1
      LIMIT 1
    `[0];
    if (!row) {
      return {
        baseUrl: this.env.NINE_ROUTER_BASE_URL,
        model: this.env.NINE_ROUTER_MODEL,
        allowedModels: configuredModels(this.env)
      };
    }
    return {
      baseUrl: row.base_url,
      model: row.model,
      allowedModels: JSON.parse(row.allowed_models) as string[]
    };
  }

  private isAdmin(request: Request): boolean {
    return (
      request.headers.get("authorization") ===
      `Bearer ${this.env.NINE_ROUTER_ADMIN_TOKEN}`
    );
  }

  private async modelsResponse(request: Request): Promise<Response> {
    if (!this.isAdmin(request)) {
      return json({ error: "Unauthorized" }, 401);
    }
    const settings = this.readModelSettings();
    const response = await fetch(`${settings.baseUrl}/models`, {
      headers: { Authorization: `Bearer ${this.env.NINE_ROUTER_API_KEY}` }
    });
    const body: unknown = await response.json();
    return json(
      {
        ok: response.ok,
        activeModel: settings.model,
        allowedModels: settings.allowedModels,
        baseUrl: settings.baseUrl,
        router: body
      },
      response.ok ? 200 : 502
    );
  }

  private async updateModelSettings(request: Request): Promise<Response> {
    if (!this.isAdmin(request)) {
      return json({ error: "Unauthorized" }, 401);
    }
    const body = (await request.json()) as {
      baseUrl?: unknown;
      model?: unknown;
      allowedModels?: unknown;
    };
    const current = this.readModelSettings();
    const baseUrl =
      typeof body.baseUrl === "string" ? body.baseUrl.trim() : current.baseUrl;
    const model =
      typeof body.model === "string" ? body.model.trim() : current.model;
    const allowedModels = Array.isArray(body.allowedModels)
      ? body.allowedModels
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
      : current.allowedModels;
    if (!baseUrl || !model || !allowedModels.includes(model)) {
      return json({ error: "model must be included in allowedModels" }, 400);
    }
    this.sql`
      INSERT INTO model_settings (id, base_url, model, allowed_models, updated_at)
      VALUES (1, ${baseUrl}, ${model}, ${JSON.stringify(allowedModels)}, ${Date.now()})
      ON CONFLICT(id) DO UPDATE SET
        base_url = excluded.base_url,
        model = excluded.model,
        allowed_models = excluded.allowed_models,
        updated_at = excluded.updated_at
    `;
    return json({ ok: true, settings: { baseUrl, model, allowedModels } });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return json({
        name: "Discord 9Router bot",
        discordWebhook: DISCORD_WEBHOOK_PATH,
        modelsEndpoint: "/api/models",
        activeModel: env.NINE_ROUTER_MODEL,
        modelConfigEndpoint: "/api/models/config"
      });
    }
    if (request.method === "GET" && url.pathname === "/api/models") {
      const agent = await getAgentByName(env.DiscordBotAgent, "default");
      return agent.fetch(request);
    }
    if (request.method === "POST" && url.pathname === "/api/models/config") {
      const agent = await getAgentByName(env.DiscordBotAgent, "default");
      return agent.fetch(request);
    }
    if (request.method === "POST" && url.pathname === DISCORD_WEBHOOK_PATH) {
      const agent = await getAgentByName(env.DiscordBotAgent, "default");
      return agent.fetch(request);
    }
    return (
      (await routeAgentRequest(request, env)) ??
      new Response("Not found", { status: 404 })
    );
  }
} satisfies ExportedHandler<Env>;
