import type { Project } from "./project";

export type EmptyProjectStructure = {
  includeContent?: boolean;
  relativePath: string;
  relativeLinkFrom?: string;
};

export type ProjectBuild = { project: Project; appBuild: boolean; };
