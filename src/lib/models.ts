import type { BaseProject } from "./base/base-project";

export type EmptyProjectStructure = {
  includeContent?: boolean;
  relativePath: string;
  relativeLinkFrom?: string;
};

export type ProjectBuild = { project: BaseProject; appBuild: boolean; };
