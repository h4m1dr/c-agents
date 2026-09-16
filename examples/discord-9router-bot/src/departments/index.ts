import { getAvailableTools } from "../tools";
import type { Department } from "../types";

export function getGeneralDepartment(env: Env): Department {
  return {
    id: "general",
    name: "General",
    systemPrompt:
      "You are the general assistant. Answer clearly and concisely in Persian.",
    tools: getAvailableTools(env)
  };
}
