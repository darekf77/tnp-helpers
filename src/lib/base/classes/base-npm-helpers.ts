//#region imports
import {
  chalk,
  child_process,
  crossPlatformPath,
  fse,
  path,
} from 'tnp-core/src';
import { _ } from 'tnp-core/src';
import { Helpers } from '../../index';
import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
import { config } from 'tnp-config/src';
import { PackageJson } from 'type-fest';
import { CoreModels } from 'tnp-core/src';
import { BasePackageJson } from './base-package-json';
import { BaseNodeModules } from './base-node-modules';
import { BaseBowerJson } from './base-bower-json';
//#endregion

export class BaseNpmHelpers<
  PROJECT extends BaseProject = BaseProject,
> extends BaseFeatureForProject<PROJECT> {
  //#region fields
  public readonly packageJson: BasePackageJson;
  public readonly _packageJsonType: typeof BasePackageJson = BasePackageJson;

  public readonly nodeModules: BaseNodeModules;
  public readonly _nodeModulesType: typeof BaseNodeModules = BaseNodeModules;

  public readonly bowerJson: BaseBowerJson;

  //#endregion

  //#region constructor
  constructor(project: PROJECT) {
    super(project);
    this.project = project;
    this.packageJson = new this._packageJsonType({ cwd: project.location });
    this.nodeModules = new this._nodeModulesType(project.location, this as any);
    this.bowerJson = new BaseBowerJson(project.location);
  }
  //#endregion

  //#region prefer yarn over npm
  preferYarnOverNpm(): boolean {
    return false;
  }
  //#endregion

  //#region reset package-lock.json
  async resetPackageLockJson() {
    //#region @backendFunc
    const children = this.project.children;
    const currentLocation = this.project.location;

    children.forEach(c => {
      Helpers.info(
        `reverting changes of package-lock.json for ${chalk.bold(c.name)}`,
      );

      // console.log(`Project ${c.name} - loc: ${c.location} `)

      try {
        this.project
          .run(
            `git checkout ${c.location.replace(currentLocation + '/', '')}/package-lock.json`,
          )
          .sync();
      } catch (error) {}
    });
    Helpers.info('RESETING DONE');
    //#endregion
  }
  //#endregion

  //#region start npm task
  startNpmTask(taskName: string, additionalArguments?: string | object) {
    //#region @backendFunc
    if (_.isObject(additionalArguments)) {
      additionalArguments = Object.keys(additionalArguments)
        .map(k => `--${k} ${additionalArguments[k]}`)
        .join(' ');
    }
    const command = `npm run ${taskName} ${
      additionalArguments ? ' -- ' + additionalArguments : ''
    }`;
    Helpers.info(`Starting npm task: "${command}"`);

    return this.project.run(command, {
      output: true,
      biggerBuffer: true,
    });
    //#endregion
  }
  //#endregion

  //#region check if logged in to registry
  /**
   *
   * @param registry without specified registr is checking npm registry
   * @returns
   */
  async isLoggedInToRegistry(registry?: string): Promise<boolean> {
    //#region @backendFunc
    // validate registry with regex
    if (registry && registry.match(/^(https?:\/\/)?([a-z0-9-]+\.?)+(:\d+)?$/)) {
      throw new Error(`Invalid registry: ${registry}`);
    }
    return new Promise((resolve, reject) => {
      child_process.exec(
        registry ? `npm whoami --registry=${registry}` : 'npm whoami',
        { cwd: this.project.location },
        (error, stdout, stderr) => {
          if (error) {
            if (stderr.includes('ENEEDAUTH')) {
              resolve(false);
            } else {
              reject(new Error(stderr));
            }
          } else {
            resolve(true);
          }
        },
      );
    });
    //#endregion
  }
  //#endregion

  //#region login to registry
  /**
   * Prompt the user to log in to a specific npm registry.
   * @param {string} [registry] - Optional npm registry URL.
   * @returns {Promise<void>} - A promise that resolves when the login process completes.
   */
  async loginToRegistry(registry?: string): Promise<void> {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const command = registry
        ? `npm login --registry=${registry}`
        : 'npm login';

      const child = child_process.exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr));
        } else {
          resolve();
        }
      });

      child.stdout.pipe(process.stdout);
      child.stderr.pipe(process.stderr);
      process.stdin.pipe(child.stdin);
    });
    //#endregion
  }
  //#endregion

  //#region check if logged in to npm
  async makeSureLoggedInToNpmRegistry(registry?: string): Promise<void> {
    //#region @backendFunc
    while (true) {
      let loggedIn = await this.isLoggedInToRegistry();
      if (loggedIn) {
        Helpers.info(
          `You logged in to npm registry=${registry || '< default npm>'}`,
        );
        break;
      }
      Helpers.pressKeyAndContinue(
        `
        NPM REGISTRY: ${!registry ? '< default public npm >' : registry}

        You are not logged in to npm. Please login to npm and press any key to continue...

        `,
      );

      try {
        if (!!registry) {
          Helpers.info(`Enter you npm credentials for registry: ${registry}`);
        }
        await this.loginToRegistry();
      } catch (error) {}
    }
    //#endregion
  }
  //#endregion
}
