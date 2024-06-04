import { BaseProject } from './base-project';

export abstract class BaseFeatureForProject<PROJECT = BaseProject> {

  constructor(protected project: PROJECT) {

  }

}

