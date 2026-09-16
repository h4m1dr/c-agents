import { generalDepartment } from "../departments";
import type { Department } from "../types";

export function getDepartmentForMessage(_message: string): Department {
  return generalDepartment;
}
