import { getDepartments } from "../departments";
import type { Department } from "../types";

export function routeMessageToDepartment(
  message: string,
  env: Env
): { department: Department; cleanedMessage: string } {
  const departments = getDepartments(env);
  const normalizedMessage = message.trim();
  const routes: Array<[string, Department]> = [
    ["/research", departments.researcher],
    ["/devops", departments.devops],
    ["/admin", departments.admin]
  ];

  for (const [prefix, department] of routes) {
    if (
      normalizedMessage === prefix ||
      normalizedMessage.startsWith(`${prefix} `)
    ) {
      return {
        department,
        cleanedMessage: normalizedMessage.slice(prefix.length).trim()
      };
    }
  }

  return { department: departments.admin, cleanedMessage: normalizedMessage };
}
