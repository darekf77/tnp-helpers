//#region imports
import { config } from 'tnp-config/src';
import { UtilsTerminal } from 'tnp-core/src';
import {
  chalk,
  child_process,
  crossPlatformPath,
  fse,
  path,
} from 'tnp-core/src';
import { _ } from 'tnp-core/src';
import { CoreModels } from 'tnp-core/src';
import { PackageJson } from 'type-fest';

import { Helpers } from '../../index';

import { BaseBowerJson } from './base-bower-json';
import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseNodeModules } from './base-node-modules';
import { BasePackageJson } from './base-package-json';
import type { BaseProject } from './base-project';

//#endregion

export class BaseNpmHelpers<
  PROJECT extends BaseProject = BaseProject,
> extends BaseFeatureForProject<PROJECT> {
  //#region fields
  public readonly packageJson: BasePackageJson;
  public readonly _packageJsonType: typeof BasePackageJson = BasePackageJson;
  private readonly _packageJsonTypeOriginal: typeof BasePackageJson =
    BasePackageJson;

  public readonly nodeModules: BaseNodeModules;
  public readonly _nodeModulesType: typeof BaseNodeModules = BaseNodeModules;
  private readonly __nodeModulesTypeOriginal: typeof BaseNodeModules =
    BaseNodeModules;

  public readonly bowerJson: BaseBowerJson;

  //#endregion

  //#region constructor
  constructor(project: PROJECT) {
    super(project);
    this.project = project;
    if (this._packageJsonType === this._packageJsonTypeOriginal) {
      this.packageJson = new this._packageJsonType({ cwd: project.location });
    }
    if (this._nodeModulesType === this.__nodeModulesTypeOriginal) {
      this.nodeModules = new this._nodeModulesType(
        project.location,
        this as any,
      );
    }
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
    Helpers.info(
      `Checking if logged in to registry: ${registry || '< default public npm >'} .... `,
    );
    if (registry && registry.match(/^(https?:\/\/)?([a-z0-9-]+\.?)+(:\d+)?$/)) {
      throw new Error(`Invalid registry: ${registry}`);
    }
    const registryLink = registry ? `--registry=${registry}` : '';
    return new Promise((resolve, reject) => {
      const command = `npm whoami ${registryLink}`;
      console.log(`Executing command: ${command}`);
      child_process.exec(
        command,
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
    Helpers.info(
      `Trying to login to npm registry: ${registry || '< default public npm >'}`,
    );

    return new Promise((resolve, reject) => {
      const args = ['login'];
      if (registry) {
        args.push(`--registry=${registry}`);
      }

      const child = child_process.spawn('npm', args, {
        stdio: 'inherit',
        shell: true, // ensures compatibility with Git Bash on Windows
      });

      child.on('exit', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm login failed with exit code ${code}`));
        }
      });

      child.on('error', err => {
        reject(err);
      });
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
          `You logged in to npm registry=${registry || '< default public npm >'}`,
        );
        break;
      }
      await UtilsTerminal.pressAnyKeyToContinueAsync({
        message: `
        NPM REGISTRY: ${!registry ? '< default public npm >' : registry}

You are not logged in to npm. Press any key and follow instructions...`,
      });

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

  //#region should release lib
  async shouldReleaseMessage(options: {
    releaseVersionBumpType: CoreModels.ReleaseVersionType;
    versionToUse?: string;
    children?: BaseProject[];
    whatToRelease: {
      itself: boolean;
      children: boolean;
    };
    skipQuestionToUser?: boolean;
  }): Promise<boolean> {
    //#region @backendFunc
    const {
      releaseVersionBumpType: releaseVersionType,
      versionToUse,
      whatToRelease: { children: releaseChildren, itself: releaseItself },
      skipQuestionToUser,
      children,
    } = options;

    const itselfString =
      `- this project: ${chalk.italic(this.project.nameForNpmPackage)}` +
      `@${chalk.bold(versionToUse ? versionToUse : this.project.packageJson.getVersionFor(releaseVersionType))}`;

    const childrenToRelease = children ? children : this.project.children;
    const childrenString = `- all (${childrenToRelease.length}) children projects: ${chalk.italic(
      (children ? children : this.project.children)
        .map(
          c =>
            `${c.nameForNpmPackage}` +
            `@${chalk.bold(c.packageJson.getVersionFor(releaseVersionType))}`,
        )
        .join(', '),
    )}`;

    let projectsInfo = '';
    if (releaseItself && releaseChildren) {
      projectsInfo = `${itselfString}\n${childrenString}`;
    } else if (!releaseItself && releaseChildren) {
      projectsInfo = `${childrenString}`;
    } else if (releaseItself && !releaseChildren) {
      projectsInfo = `${itselfString}`;
    }
    Helpers.info(`
      Projects to release:
${projectsInfo}
      `);

    let message = `Proceed with release ?`;

    return skipQuestionToUser
      ? true
      : await UtilsTerminal.confirm({ message, defaultValue: true });

    //#endregion
  }
  //#endregion

  //#region publish to npm registry
  /**
   * @param registry when not specified, it will use the default npm registry
   */
  async publishToNpmRegistry(options?: { registry?: string }): Promise<void> {
    //#region @backendFunc
    const { registry } = options || {};
    const accessPublic =
      this.packageJson.name.startsWith('@') && this.packageJson.isPrivate
        ? '--access public'
        : '';
    const registryOpt = registry ? `--registry ${registry}` : '';

    await this.project
      .run(`npm publish ${registryOpt} ${accessPublic}`, {
        output: true,
        silence: false,
      })
      .sync();
    //#endregion
  }
  //#endregion

  //#region get package version from npm registry
  getPackageVersionFromNpmRegistry(
    packageName: string,
    options?: {
      registry?: string;
    },
  ): Promise<string | undefined> {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const { registry } = options || {};
      const registryOpt = registry ? `--registry ${registry}` : '';

      child_process.exec(
        `npm view ${packageName} version ${registryOpt}`,
        { cwd: this.project.location },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(stderr));
          } else {
            resolve(stdout.trim());
          }
        },
      );
    });
    //#endregion
  }
  //#endregion
}
