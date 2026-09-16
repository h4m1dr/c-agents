import type { AgentTool } from "../types";

interface TavilyResponse {
  answer?: string;
  results?: unknown;
  response_time?: number;
}

export function webSearchTool(env: Env): AgentTool {
  return {
    schema: {
      type: "function",
      function: {
        name: "search_web",
        description: "Searches the web for current and up-to-date information.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "The web search query." }
          },
          required: ["query"],
          additionalProperties: false
        }
      }
    },
    async execute(args) {
      try {
        const query = typeof args.query === "string" ? args.query.trim() : "";
        if (!query) {
          return "Error searching web: query is required.";
        }
        if (!env.TAVILY_API_KEY) {
          return "Error searching web: TAVILY_API_KEY is not configured.";
        }

        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            api_key: env.TAVILY_API_KEY,
            query,
            include_answer: true
          })
        });
        const body = (await response.json()) as TavilyResponse;
        if (!response.ok) {
          return `Error searching web: ${body.answer ?? response.statusText}`;
        }
        return body.answer ?? JSON.stringify(body.results ?? []);
      } catch (error) {
        return `Error searching web: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}
