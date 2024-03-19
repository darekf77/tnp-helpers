import { BaseProject } from '.';

export abstract class BaseFeatureForProject<PROJECT = BaseProject> {

  constructor(protected project: PROJECT) {

  }

}

