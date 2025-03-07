//#region imports
import { config } from 'tnp-config/src';
import {
  CoreModels,
  crossPlatformPath,
  fse,
  path,
  _,
  chalk,
  dateformat,
} from 'tnp-core/src';
import type { BaseNpmHelpers } from 'tnp-helpers/src';
import { Helpers } from '../../index';
import type { BaseProject } from './base-project';
//#endregion

export class BaseNodeModules<
  NPM_HELPERS extends BaseNpmHelpers = BaseNpmHelpers,
> {
  protected _npmHelpersType: NPM_HELPERS;

  //#region constructor
  constructor(
    /**
     * my-path/node_modules
     */
    protected cwd: string,
    protected npmHelpers: NPM_HELPERS,
  ) {
    this.npmHelpers = npmHelpers;
  }
  //#endregion

  //#region path
  /**
   * cwd + node_modules
   */
  get path() {
    return crossPlatformPath([this.cwd, config.folder.node_modules]);
  }
  //#endregion

  //#region path for package
  /**
   * Path to package inside node_modules folder
   * @example <project-path>/node_modules/<package-name>
   */
  pathFor(packageName: string): string {
    //#region @backendFunc
    return crossPlatformPath([this.realPath, packageName]);
    //#endregion
  }
  //#endregion

  //#region real path of node_modules - if node_modules is a link
  /**
   * real path of node_modules
   * if node_modules is a link
   * it will return real path.
   * if node_modules is folder = path
   */
  get realPath() {
    try {
      const realPath = fse.realpathSync(this.path);
      return realPath;
    } catch (error) {
      return this.path;
    }
  }
  //#endregion

  //#region prevent wrong link destination
  protected preventWrongLinkDestination(dest: string): string {
    if (!path.isAbsolute(dest)) {
      Helpers.error(
        `[linkTo..] target destination path is not absolute "${dest}"`,
      );
    }

    if (dest.endsWith(`/${config.folder.node_modules}`)) {
      return dest;
    }
    return crossPlatformPath([dest, config.folder.node_modules]);
  }
  //#endregion

  //#region link node_modules to other project
  linkToProject(project: Partial<BaseProject>) {
    //#region @backendFunc
    const source = this.realPath;
    let dest = project.pathFor(config.folder.node_modules);
    dest = this.preventWrongLinkDestination(dest);
    Helpers.remove(dest, true);
    Helpers.createSymLink(source, dest, {
      continueWhenExistedFolderDoesntExists: true,
    });
    //#endregion
  }
  //#endregion

  //#region link to project or location
  linkToLocation(location: string): void {
    //#region @backendFunc
    let dest = crossPlatformPath(location);
    dest = this.preventWrongLinkDestination(dest);
    Helpers.remove(dest, true);
    Helpers.createSymLink(this.realPath, dest, {
      continueWhenExistedFolderDoesntExists: true,
    });
    //#endregion
  }
  //#endregion

  //#region make sure node modules installed
  async makeSureInstalled(options?: Omit<CoreModels.NpmInstallOptions, 'pkg'>) {
    if (this.isEmpty()) {
      await this.reinstall(options);
    }
  }
  //#endregion

  //#region delete node_modules
  remove() {
    Helpers.remove(this.path, true);
  }
  //#endregion

  //#region remove package inside
  removePackage(packageInside: string): void {
    //#region @backendFunc
    Helpers.log(`Removing node_modules from ${this.path}`);
    Helpers.removeIfExists([this.path, packageInside]);
    //#endregion
  }
  //#endregion

  //#region reinstall node modules
  async reinstall(options?: Omit<CoreModels.NpmInstallOptions, 'pkg'>) {
    //#region @backendFunc

    options = _.cloneDeep(options || {});
    if (_.isUndefined(options.useYarn)) {
      options.useYarn = this.npmHelpers.preferYarnOverNpm();
    }
    if (_.isUndefined(options.removeYarnOrPackageJsonLock)) {
      options.removeYarnOrPackageJsonLock = true;
    }

    Helpers.taskStarted(
      `
      [${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}]
      Reinstalling node modules in ${this.cwd} with ${options.useYarn ? 'yarn' : 'npm'}

      `,
    );
    while (true) {
      this.remove();
      // TODO @LAST - use method makeSureNodeModulesInstalled()
      try {
        Helpers.run(await this.prepareCommand(options), {
          output: true,
          silence: false,
          cwd: this.cwd,
        }).sync();
        break;
      } catch (error) {
        console.log(error);
        const nodeModulesInstallFailOptions = {
          again: {
            name: 'Try again normal installation',
          },
          againForce: {
            name: 'Try again force installation',
          },
          skip: {
            name: 'Skip this error and continue',
          },
          exit: {
            name: 'Exit process',
          },
        };
        const res = await Helpers.consoleGui.select<
          keyof typeof nodeModulesInstallFailOptions
        >('What to do?', nodeModulesInstallFailOptions);
        if (res === 'again') {
          options.force = false;
          continue;
        }
        if (res === 'againForce') {
          options.force = true;
          continue;
        }
        if (res === 'exit') {
          process.exit(0);
        }
        if (res === 'skip') {
          break;
        }
      }
    }

    Helpers.taskDone(`
      [${dateformat(new Date(), 'dd-mm-yyyy HH:MM:ss')}]
      Reinstalled node modules for ${this.cwd}
      `);
    this.npmHelpers.packageJson.reloadPackageJsonInMemory();
    //#endregion
  }
  //#endregion

  //#region is link
  get isLink(): boolean {
    return Helpers.isSymlinkFileExitedOrUnexisted(this.path);
  }
  //#endregion

  get empty() {
    return this.isEmpty();
  }

  //#region fields & getters / empty node_modules
  /**
   * @returns true if node_modules folder is empty
   * DEEP CHECK - also if node_modules is a link
   * and is not existent
   */
  isEmpty() {
    //#region @backendFunc
    let node_modules_path = this.path;

    if (Helpers.exists(node_modules_path)) {
      try {
        const real_node_modules_path = crossPlatformPath(
          fse.realpathSync(
            crossPlatformPath([this.cwd, config.folder.node_modules]),
          ),
        );
        node_modules_path = real_node_modules_path;
      } catch (error) {}
    }

    if (Helpers.isUnexistedLink(node_modules_path)) {
      try {
        Helpers.logWarn(
          `[npm-helpers][emptyNodeModules] removing unexisted node_modules` +
            ` link form ${this.cwd}`,
        );
        fse.unlinkSync(node_modules_path);
      } catch (error) {}
      return true;
    }

    if (!Helpers.exists(node_modules_path)) {
      return true;
    }

    if (!Helpers.exists(crossPlatformPath([node_modules_path, '.bin']))) {
      return true;
    }

    if (Helpers.findChildren(node_modules_path, c => c).length === 0) {
      return true;
    }

    const minDepsLength = Object.keys(
      this.npmHelpers.packageJson.allDependencies,
    ).length;

    const notFullyInstalled =
      Helpers.findChildren(node_modules_path, c => c).length <
      minDepsLength + 1;

    if (notFullyInstalled) {
      Helpers.logWarn(
        `[npm-helpers] Not all deps are installed in ${this.cwd}`,
      );
    }

    return notFullyInstalled;
    //#endregion
  }
  //#endregion

  //#region prepare command
  /**
   *  Prepare command for npm install
   * (or yarn install)
   */
  async prepareCommand(
    options?: CoreModels.NpmInstallOptions,
  ): Promise<string> {
    //#region @backendFunc
    let {
      pkg,
      silent,
      useYarn,
      force,
      removeYarnOrPackageJsonLock,
      generateYarnOrPackageJsonLock,
    } = options || {};

    force = true; // TODO QUICK_FIX

    let command = '';
    const commonOptions = `--ignore-engines`;

    if (useYarn) {
      //#region yarn
      const argsForFasterInstall = `${force ? '--force' : ''} ${commonOptions} `;
      command =
        `${
          removeYarnOrPackageJsonLock
            ? `(rm ${config.file.yarn_lock}  || true) ` +
              `&& touch ${config.file.yarn_lock} && `
            : ''
        }` +
        `yarn ${pkg ? (pkg?.installType === 'remove' ? 'remove' : 'add') : 'install'} ${pkg ? pkg.name : ''} ` +
        ` ${generateYarnOrPackageJsonLock ? '' : '--no-lockfile'} ` +
        ` ${argsForFasterInstall} ` +
        ` ${pkg && pkg.installType && pkg.installType === '--save-dev' ? '-dev' : ''} `;
      //#endregion
    } else {
      //#region npm
      const argsForFasterInstall =
        `${force ? '--force' : ''} ${commonOptions} --no-audit ` +
        `${silent ? '--silent --no-progress' : ''}   `;

      command =
        `${
          removeYarnOrPackageJsonLock
            ? `(rm ${config.file.package_lock_json} || true) ` +
              `&& touch ${config.file.package_lock_json}  && `
            : ''
        }` +
        `npx --node-options=--max-old-space-size=8000 npm ` +
        `${pkg?.installType === 'remove' ? 'uninstall' : 'install'} ${pkg ? pkg.name : ''} ` +
        ` ${generateYarnOrPackageJsonLock ? '' : '--no-package-lock'} ` +
        ` ${pkg && pkg.installType ? pkg.installType : ''} ` +
        ` ${argsForFasterInstall} `;
      //#endregion
    }
    Helpers.info(`Command for npm install:

      ${command}

      `);
    return command;
    //#endregion
  }
  //#endregion

  //#region dedupe packages action
  public dedupePackages(
    packagesNames?: string[],
    countOnly = false,
    warnings = true,
  ): void {
    //#region @backendFunc
    const projectLocation = this.cwd;
    Helpers.taskStarted(
      `${countOnly ? 'Counting' : 'Fixing/removing'} duplicates ${path.basename(
        projectLocation,
      )}/node_modules`,
    );

    const rules: {
      [key: string]: { ommitParents: string[]; onlyFor: string[] };
    } = {};

    packagesNames = (packagesNames || []).reduce((a, current, i, arr) => {
      // @ts-ignore
      return a.concat([ 
        ...(Array.isArray(current)
          ? ((depsArr: string[]) => {
            // @ts-ignore
              const first: string = _.first(depsArr);
              depsArr = depsArr.slice(1);
              rules[first] = {
                ommitParents: depsArr
                  .filter(f => f.startsWith('!'))
                  .map(f => f.replace(/^\!/, '')),
                onlyFor: depsArr.filter(f => !f.startsWith('!')),
              };
              if (rules[first].onlyFor.length === 0) {
                // @ts-ignore
                delete rules[first].onlyFor;
              }
              if (rules[first].ommitParents.length === 0) {
                // @ts-ignore
                delete rules[first].ommitParents;
              }

              return [first];
            })(current)
          : [current]),
      ]);
    }, []);

    packagesNames.forEach(f => {
      let organizationProjectSeondPart = '';
      if (f.search('/') !== -1) {
        organizationProjectSeondPart = f.split('/')[1];
        f = _.first(f.split('/'));
      }
      let pathToCurrent = path.join(
        projectLocation,
        config.folder.node_modules,
        f,
        organizationProjectSeondPart,
      );

      const current = this.npmHelpers.ins.From(pathToCurrent);

      if (!current) {
        warnings && Helpers.log(`Project with name ${f} not founded`);
        return;
      }
      Helpers.logInfo(
        `Scanning for duplicates of current ` +
          `${current.name}@${current.npmHelpers.packageJson.version} ....\n`,
      );
      const nodeMod = path.join(projectLocation, config.folder.node_modules);
      if (!fse.existsSync(nodeMod)) {
        Helpers.mkdirp(nodeMod);
      }
      const removeCommand = `find ${
        config.folder.node_modules
      }/ -name ${f.replace('@', '\\@')} `;
      // console.log(`removeCommand: ${removeCommand}`)
      const res = Helpers.run(removeCommand, {
        output: false,
        cwd: projectLocation,
      })
        .sync()
        .toString();
      const duplicates = res
        .split('\n')
        .map(l => l.replace(/\/\//g, '/'))
        .filter(l => !!l)
        .filter(l => !l.startsWith(`${config.folder.node_modules}/${f}`))
        .filter(
          l =>
            !l.startsWith(
              `${config.folder.node_modules}/${config.folder._bin}`,
            ),
        )
        .filter(
          l => path.basename(path.dirname(l)) === config.folder.node_modules,
        );

      if (countOnly) {
        duplicates.forEach((duplicateRelativePath, i) => {
          let p = path.join(
            projectLocation,
            duplicateRelativePath,
            organizationProjectSeondPart,
          );
          const nproj = this.npmHelpers.ins.From(p);
          if (!nproj) {
            // Helpers.warn(`Not able to identyfy project in ${p}`)
          } else {
            p = p.replace(
              path.join(projectLocation, config.folder.node_modules),
              '',
            );
            Helpers.info(
              `${i + 1}. Duplicate "${nproj.name}@${
                nproj.npmHelpers.packageJson.version
              }" in:\n\t ${chalk.bold(p)}\n`,
            );
          }
        });
        if (duplicates.length === 0) {
          Helpers.logInfo(`No dupicate of ${current.name} fouded.`);
        }
      } else {
        duplicates.forEach(duplicateRelativePath => {
          const p = path.join(projectLocation, duplicateRelativePath);
          const projRem = this.npmHelpers.ins.From(p);
          const versionRem = projRem && projRem.npmHelpers.packageJson.version;

          let parentName = path.basename(
            path
              .dirname(p)
              .replace(
                new RegExp(
                  `${Helpers.escapeStringForRegEx(
                    config.folder.node_modules,
                  )}\/?$`,
                ),
                '',
              )
              .replace(/\/$/, ''),
          );

          const org = path.basename(
            path.dirname(path.dirname(path.dirname(p))),
          );
          if (org.startsWith('@') || org.startsWith('@')) {
            parentName = `${org}/${parentName}`;
          }

          const parentLabel = parentName ? `${parentName}/` : ''; // TODO not working !

          if (rules[current.name]) {
            const r = rules[current.name];
            if (
              _.isArray(r.ommitParents) &&
              (r.ommitParents.includes(parentName) ||
                _.isObject(
                  r.ommitParents.find(o =>
                    o.startsWith(parentName.replace('*', '')),
                  ),
                ))
            ) {
              Helpers.logWarn(
                `[excluded] Ommiting duplicate of ` +
                  `${parentLabel}${
                    current.name
                  }@${versionRem} inside ${chalk.bold(parentName)}`,
              );
              return;
            }
            if (_.isArray(r.onlyFor) && !r.onlyFor.includes(parentName)) {
              Helpers.logWarn(
                `[not included] Ommiting duplicate of ` +
                  `${parentLabel}${
                    current.name
                  }@${versionRem} inside ${chalk.bold(parentName)}`,
              );
              return;
            }
          }

          Helpers.remove(p, true);
          Helpers.logWarn(
            `Duplicate of ${parentLabel}${current.name}@${versionRem}` +
              ` removed from ${chalk.bold(parentName)}`,
          );
        });
      }
    });

    Helpers.taskDone(
      `${
        countOnly ? 'Counting' : 'Fixing/removing'
      } duplicates from npm container`,
    );
    //#endregion
  }
  //#endregion
}
