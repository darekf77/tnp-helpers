//#region imports
import type { ChildProcess, StdioOptions } from 'child_process';

import {
  child_process,
  CoreModels,
  UtilsJson,
  UtilsDotFile,
  Helpers,
  path,
  _,
  crossPlatformPath,
} from 'tnp-core/src';
import { UtilsOs } from 'tnp-core/src';

import { UtilsDocker, UtilsJava } from '../../utils';

import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';
//#endregion

export class BaseDocker<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {

  //#region update docker compose ports in .env
  /**
   * Updates ports in .env file based on available ports range.
   */
  async updateDockerComposePorts(): Promise<void> {

    //#region @backendFunc
    const envPath = this.project.pathFor('.env');

    const envKeyAndComments =
      UtilsDotFile.getCommentsKeysAsJsonObject(envPath) || {};

    const envKeyAndCommentsKey = Object.keys(envKeyAndComments);
    for (const key of envKeyAndCommentsKey) {
      const comment = envKeyAndComments[key];
      const tags = UtilsJson.getAttributiesFromComment(comment);
      if (tags.map(c => c.name).includes(CoreModels.tagForTaskName)) {
        const tag = tags.find(c => c.name === CoreModels.tagForTaskName);
        const taskName = tag.value;
        const taskPort = await this.project.registerAndAssignPort(taskName);
        UtilsDotFile.setValueToDotFile(envPath, key, taskPort);
        UtilsDotFile.setCommentToKeyInDotFile(
          envPath,
          key,
          `${tag.name}="${tag.value}"`,
        );
        console.log(
          `Updating .env "${key}"="${taskPort}" from available ports range.`,
        );
      }
    }
    //#endregion

  }
  //#endregion

  //#region docker compose up / down
  getDockerComposeActionChildProcess(
    action: UtilsDocker.DockerComposeActionType,
    options?: UtilsDocker.DockerComposeActionOptions,
  ): ChildProcess {

    //#region @backendFunc
    options = options || {};
    options.cwd = options?.cwd || this.project.location;

    return UtilsDocker.getDockerComposeActionChildProcess(action, options);
    //#endregion

  }
  //#endregion

  //#region remove all images by COMPOSE_PROJECT_NAME from .env
  async removeAllImagesBy_Env_COMPOSE_PROJECT_NAME(): Promise<void> {

    //#region @backendFunc
    await UtilsDocker.cleanImagesAndContainersByDockerLabel(
      UtilsDocker.DOCKER_LABEL_KEY,
      UtilsDotFile.getValueFromDotFile(
        this.project.pathFor('.env'),
        'COMPOSE_PROJECT_NAME',
      ).toString(),
    );
    //#endregion

  }
  //#endregion

}