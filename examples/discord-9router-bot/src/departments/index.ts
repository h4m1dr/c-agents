import { getAvailableTools } from "../tools";
import type { Department } from "../types";

export function getDepartments(env: Env): Record<string, Department> {
  const tools = getAvailableTools(env);
  const byName = new Map(
    tools.map((agentTool) => [agentTool.schema.function.name, agentTool])
  );

  return {
    researcher: {
      id: "researcher",
      name: "Research Department",
      systemPrompt:
        "You are a Senior Researcher. Search the web, gather current information, and provide concise, accurate summaries. Always cite your sources.",
      tools: [byName.get("search_web")].filter(
        (agentTool): agentTool is NonNullable<typeof agentTool> =>
          agentTool !== undefined
      )
    },
    devops: {
      id: "devops",
      name: "DevOps & Engineering",
      systemPrompt:
        "You are a Senior Software Engineer and DevOps expert. Write code, test it in the sandbox, and interact with GitHub repositories. Think step-by-step before executing code.",
      tools: [
        byName.get("execute_code_sandbox"),
        byName.get("read_github_file"),
        byName.get("create_github_commit")
      ].filter(
        (agentTool): agentTool is NonNullable<typeof agentTool> =>
          agentTool !== undefined
      )
    },
    admin: {
      id: "admin",
      name: "General Admin",
      systemPrompt:
        "You are the General Admin Assistant. You have access to all tools. Decide which tool is best suited for the user's request.",
      tools
    }
  };
}
