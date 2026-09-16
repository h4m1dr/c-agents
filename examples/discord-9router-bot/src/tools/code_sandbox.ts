import type { AgentTool } from "../types";

interface PistonResponse {
  run?: {
    output?: string;
    stdout?: string;
    stderr?: string;
  };
}

export function codeSandboxTool(): AgentTool {
  return {
    schema: {
      type: "function",
      function: {
        name: "execute_code_sandbox",
        description:
          "Executes code in an isolated sandbox (e.g., python, javascript). Returns stdout or stderr.",
        parameters: {
          type: "object",
          properties: {
            language: {
              type: "string",
              description:
                "The programming language, such as python or javascript."
            },
            code: {
              type: "string",
              description: "The source code to execute."
            }
          },
          required: ["language", "code"],
          additionalProperties: false
        }
      }
    },
    async execute(args) {
      try {
        const language = typeof args.language === "string" ? args.language : "";
        const code = typeof args.code === "string" ? args.code : "";
        if (!language || !code) {
          return "Error executing tool: language and code are required.";
        }

        const response = await fetch("https://emkc.org/api/v2/piston/execute", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            language,
            version: "*",
            files: [{ content: code }]
          })
        });
        const body = (await response.json()) as PistonResponse;
        if (!response.ok) {
          return `Error executing tool: ${body.run?.stderr ?? response.statusText}`;
        }
        return (
          body.run?.output ??
          `${body.run?.stdout ?? ""}${body.run?.stderr ?? ""}`
        );
      } catch (error) {
        return `Error executing tool: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  };
}
