import type { AgentTool } from "../types";

interface GitHubContentResponse {
  content?: string;
  encoding?: string;
  message?: string;
  sha?: string;
}

function decodeBase64Utf8(content: string): string {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeBase64Utf8(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function githubHeaders(env: Env): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "h4m1dr-agents",
    ...(env.GITHUB_PAT ? { Authorization: `Bearer ${env.GITHUB_PAT}` } : {})
  };
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
            headers: githubHeaders(env)
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

export function githubCommitTool(env: Env): AgentTool {
  return {
    schema: {
      type: "function",
      function: {
        name: "create_github_commit",
        description: "Creates or updates a file in a GitHub repository with a new commit.",
        parameters: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            path: { type: "string" },
            content: { type: "string" },
            commit_message: { type: "string" }
          },
          required: ["owner", "repo", "path", "content", "commit_message"],
          additionalProperties: false
        }
      }
    },
    async execute(args) {
      try {
        const owner = typeof args.owner === "string" ? args.owner : "";
        const repo = typeof args.repo === "string" ? args.repo : "";
        const path = typeof args.path === "string" ? args.path : "";
        const content = typeof args.content === "string" ? args.content : "";
        const commitMessage =
          typeof args.commit_message === "string" ? args.commit_message : "";
        if (!owner || !repo || !path || !commitMessage) {
          return "Error creating GitHub commit: owner, repo, path, and commit_message are required.";
        }

        const encodedPath = path.split("/").map(encodeURIComponent).join("/");
        const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
        const existingResponse = await fetch(url, { headers: githubHeaders(env) });
        let sha: string | undefined;
        if (existingResponse.ok) {
          const existing = (await existingResponse.json()) as GitHubContentResponse;
          sha = existing.sha;
        } else if (existingResponse.status !== 404) {
          const existing = (await existingResponse.json()) as GitHubContentResponse;
          return `Error checking GitHub file: ${existing.message ?? existingResponse.statusText}`;
        }

        const response = await fetch(url, {
          method: "PUT",
          headers: { ...githubHeaders(env), "content-type": "application/json" },
          body: JSON.stringify({
            message: commitMessage,
            content: encodeBase64Utf8(content),
            ...(sha ? { sha } : {})
          })
        });
        const body = (await response.json()) as GitHubContentResponse;
        if (!response.ok) {
          return `Error creating GitHub commit: ${body.message ?? response.statusText}`;
        }
        return `GitHub commit created successfully for ${owner}/${repo}/${path}.`;
      } catch (error) {
        return `Error creating GitHub commit: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}
