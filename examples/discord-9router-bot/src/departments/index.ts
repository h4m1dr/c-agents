import { availableTools } from "../tools";
import type { Department } from "../types";

export const generalDepartment: Department = {
  id: "general",
  name: "General",
  systemPrompt:
    "You are the general assistant. Answer clearly and concisely in Persian.",
  tools: availableTools
};

export const departments: Department[] = [generalDepartment];
