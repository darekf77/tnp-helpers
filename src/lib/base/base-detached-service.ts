import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';

export class BaseDetachedService<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject {
  public project: PROJECT;

  constructor(project: PROJECT) {
    super(project);
    this.project = project;
  }
}
