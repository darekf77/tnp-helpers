import { BaseProject } from './base-project';

export abstract class BaseFeatureForProject<
  PROJECT extends BaseProject<any,any> =  BaseProject<any,any>,
> {
  get ins() {
    return this.project.ins;
  }

  constructor(protected project: PROJECT) {}
}
