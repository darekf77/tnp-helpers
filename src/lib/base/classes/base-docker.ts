import type { ChildProcess, StdioOptions } from 'child_process';

import { child_process, CoreModels, UtilsJson } from 'tnp-core/src';

import { UtilsDotFile, UtilsJava } from '../../utils';

import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';

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
  getDockerComposeUpExecChildProcess(
    action: 'up' | 'down',
    options?: {
      composeFileName?: string;
      cwd?: string;
      env?: NodeJS.ProcessEnv;
      stdio?: StdioOptions;
    },
  ): ChildProcess {
    //#region @backendFunc
    options = options || {};
    const composeFileName = options?.composeFileName || 'docker-compose.yml';
    const cwd = options?.cwd || this.project.location;
    const env = {
      ...process.env,
      ...(options?.env || {}),
    };
    const child = child_process.spawn(
      'docker-compose',
      [
        '-f',
        composeFileName,
        ...(action === 'up' ? ['up', '--build'] : ['down']),
      ],
      {
        env,
        cwd,
        stdio: options.stdio || 'inherit', // inherit stdio so output shows in terminal
      },
    );

    return child;
    //#endregion
  }
  //#endregion
}
