import type { AgentTool } from "../types";

interface GitHubContentResponse {
  content?: string;
  encoding?: string;
  message?: string;
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function githubManagerTool(env: Env): AgentTool {
  return {
    schema: {
      type: "function",
      function: {
        name: "read_github_file",
        description: "Reads the content of a file from a GitHub repository.",
        parameters: {
          type: "object",
          properties: {
            owner: {
              type: "string",
              description: "GitHub account or organization."
            },
            repo: { type: "string", description: "GitHub repository name." },
            path: {
              type: "string",
              description: "Repository-relative file path."
            }
          },
          required: ["owner", "repo", "path"],
          additionalProperties: false
        }
      }
    },
    async execute(args) {
      try {
        const owner = typeof args.owner === "string" ? args.owner : "";
        const repo = typeof args.repo === "string" ? args.repo : "";
        const path = typeof args.path === "string" ? args.path : "";
        if (!owner || !repo || !path) {
          return "Error reading GitHub file: owner, repo, and path are required.";
        }

        const encodedPath = path.split("/").map(encodeURIComponent).join("/");
        const response = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              "User-Agent": "h4m1dr-agents",
              ...(env.GITHUB_PAT
                ? { Authorization: `Bearer ${env.GITHUB_PAT}` }
                : {})
            }
          }
        );
        const body = (await response.json()) as GitHubContentResponse;
        if (!response.ok) {
          return `Error reading GitHub file: ${body.message ?? response.statusText}`;
        }
        if (body.encoding !== "base64" || !body.content) {
          return "Error reading GitHub file: GitHub did not return base64 file content.";
        }
        return decodeBase64Utf8(body.content);
      } catch (error) {
        return `Error reading GitHub file: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}
