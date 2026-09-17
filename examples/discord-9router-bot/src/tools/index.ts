import type { AgentTool } from "../types";
import { codeSandboxTool } from "./code_sandbox";
import { githubCommitTool, githubManagerTool } from "./github_manager";
import { webSearchTool } from "./web_search";

export function getAvailableTools(env: Env): AgentTool[] {
  return [
    codeSandboxTool(),
    githubManagerTool(env),
    githubCommitTool(env),
    webSearchTool(env)
  ];
}
