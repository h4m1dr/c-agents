import { getGeneralDepartment } from "../departments";
import type { Department } from "../types";

export function getDepartmentForMessage(
  _message: string,
  env: Env
): Department {
  return getGeneralDepartment(env);
}
