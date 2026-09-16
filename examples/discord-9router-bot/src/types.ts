export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface AgentTool {
  schema: ToolSchema;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface Department {
  id: string;
  name: string;
  systemPrompt: string;
  tools: AgentTool[];
}
