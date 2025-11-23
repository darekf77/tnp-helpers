//#region imports
import type fs from 'fs';

import { config } from 'tnp-config/src';
import { UtilsOs } from 'tnp-core/src';
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

export type DedupePackage =
  | string
  | {
      package: string;
      excludeFrom?: string[];
      includeOnlyIn?: string[];
    };

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
  pathFor(packageName: string | string[]): string {
    //#region @backendFunc
    packageName = crossPlatformPath(packageName);
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
      const realPath = crossPlatformPath(fse.realpathSync(this.path));
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
    Helpers.createSymLink(source, dest, {
      continueWhenExistedFolderDoesntExists: true,
    });
    //#endregion
  }
  //#endregion

  //#region link node_modules to other project
  copyToProject(project: BaseProject): void {
    //#region @backendFunc
    Helpers.taskStarted(`Copying node_modules folder to project ${project.name}/node_modules`);
    const source = this.realPath;
    let dest = project.pathFor(config.folder.node_modules);
    dest = this.preventWrongLinkDestination(dest);
    Helpers.removeSymlinks(dest);
    Helpers.remove(dest, true);
    Helpers.copy(source, dest, {
      recursive: true,
      overwrite: true,
      copySymlinksAsFiles: false,
    });
    Helpers.taskDone(`Done copying node_modules folder to project ${project.name}/node_modules`);
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
  async remove(options?: { skipQuestion?: boolean }): Promise<void> {
    //#region @backendFunc
    options = options || {};
    if (
      options.skipQuestion ||
      (await Helpers.questionYesNo(
        `You are about delete ${config.folder.node_modules} (Yes -> continue, No -> skip action) ?`,
      ))
    ) {
      Helpers.removeSymlinks(this.path);
      Helpers.remove(this.path, true);
    }
    //#endregion
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
      Reinstalling node modules in:
${this.cwd}

with ${options.useYarn ? 'yarn' : 'npm'}

      `,
    );
    while (true) {
      if (!options.skipRemovingNodeModules) {
        await this.remove({ skipQuestion: true });
      }
      // TODO @LAST - use method makeSureNodeModulesInstalled()
      try {
        Helpers.run(await this.prepareCommand(options, this.cwd), {
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

  unlinkNodeModulesWhenLinked() {
    //#region @backendFunc
    if (this.isLink) {
      try {
        Helpers.info(
          `Unlinking incorrect node_modules link from ${path.basename(this.cwd)}`,
        );
        fse.unlinkSync(this.path);
      } catch (error) {}
    }
    //#endregion
  }

  //#region empty
  get empty() {
    return this.isEmpty();
  }
  //#endregion

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

    const childrenInNodeModules = Helpers.foldersFrom(node_modules_path);

    if (childrenInNodeModules.length === 0) {
      return true;
    }

    const minDepsLength = Object.keys(
      this.npmHelpers.packageJson.allDependencies,
    ).length;

    const notFullyInstalled = childrenInNodeModules.length < minDepsLength + 1;

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
    options: CoreModels.NpmInstallOptions,
    cwd: string = this.cwd,
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

    force = true; // TODO QUICK_FIX @UNCOMMENT

    let command = '';
    const commonOptions = `--ignore-engines`;

    if (useYarn) {
      //#region yarn
      const argsForFasterInstall = `${force ? '--force' : ''} ${commonOptions} `;
      if (removeYarnOrPackageJsonLock) {
        const yarnLock = crossPlatformPath([cwd, config.file.yarn_lock]);
        try {
          fse.unlinkSync(yarnLock);
        } catch (error) {}
        fse.writeFileSync(yarnLock, ''); // simulate touch
      }

      command =
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

      if (removeYarnOrPackageJsonLock) {
        const packageLock = crossPlatformPath([
          cwd,
          config.file.package_lock_json,
        ]);
        try {
          fse.unlinkSync(packageLock);
        } catch (error) {}
        fse.writeFileSync(packageLock, ''); // simulate touch
      }

      command =
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

  //#region find package dirs
  /**
   *
   * @param rootDir
   * @param packageName
   * @returns absolute paths to package dirs
   */
  private findPackageDirs(
    rootDir: string,
    packageName: string,
    options: { maxDepth?: number; signal?: AbortSignal } = {},
  ): string[] {
    //#region @backendFunc
    const results: string[] = [];
    const visited = new Set<string>();
    const maxDepth = options.maxDepth ?? 10;

    const targetParts = packageName.split('/'); // handle @scope/pkg

    const walk = (dir: string, depth = 0): Promise<void> => {
      if (options.signal?.aborted) return;
      if (depth > maxDepth) return;
      if (visited.has(dir)) return;
      visited.add(dir);

      let entries: fs.Dirent[];
      try {
        entries = fse.readdirSync(dir, { withFileTypes: true });
      } catch {
        return; // permission or broken symlink
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const subdir = crossPlatformPath([dir, entry.name]);

        // we only care about node_modules structure
        if (entry.name === 'node_modules' || dir.endsWith('node_modules')) {
          // try to match direct package or @scope/pkg structure
          if (entry.name === targetParts[0] && targetParts.length === 1) {
            results.push(subdir);
            continue;
          }

          if (entry.name === targetParts[0] && targetParts.length > 1) {
            const scoped = crossPlatformPath([subdir, targetParts[1]]);
            try {
              const stat = fse.statSync(scoped);
              if (stat.isDirectory()) results.push(scoped);
            } catch {}
            continue;
          }

          // otherwise keep descending only within node_modules
          walk(subdir, depth + 1);
        }
      }
    };

    walk(rootDir);
    return results;
    //#endregion
  }
  //#endregion

  //#region dedupe packages action
  dedupePackages(
    packagesConfig?: DedupePackage[],
    countOnly = false,
    fake = false,
  ): void {
    //#region @backendFunc
    // packagesConfig = ['@angular/cdk', 'tnp-models'];
    Helpers.taskStarted(
      `${countOnly ? 'Counting' : 'Removing'} duplicates in node_modules ${fake ? '(fake process)' : ''}...`,
    );

    for (const entry of packagesConfig) {
      let packageNameForDuplicationRemoval: string;
      let excludeFrom: string[] = [];
      let includeOnlyIn: string[] = [];

      if (typeof entry === 'string') {
        packageNameForDuplicationRemoval = entry;
      } else {
        packageNameForDuplicationRemoval = entry.package;
        excludeFrom = entry.excludeFrom || [];
        includeOnlyIn = entry.includeOnlyIn || [];
      }
      packageNameForDuplicationRemoval = crossPlatformPath(
        packageNameForDuplicationRemoval,
      );

      Helpers.info(
        `[${config.frameworkName}] Checking npm duplicates of ${packageNameForDuplicationRemoval}`,
      );

      const nodeModulesRoot = crossPlatformPath([
        this.cwd,
        config.folder.node_modules,
      ]);

      Helpers.taskStarted(
        `Looking for directories ${packageNameForDuplicationRemoval}`,
      );
      const foundAbsPaths = this.findPackageDirs(
        nodeModulesRoot,
        packageNameForDuplicationRemoval,
        { maxDepth: 15 },
      );

      // console.log({foundAbsPaths})
      Helpers.taskDone(
        `Looking for directories done. Found: ${foundAbsPaths.length}`,
      );

      const duplicates = foundAbsPaths.filter(foundedAbsPath => {
        // console.log({ foundedRelativePath });

        const relative = crossPlatformPath([
          foundedAbsPath.replace(nodeModulesRoot + '/', ''),
        ]);
        // console.log({ relative });

        if (relative?.startsWith('..')) {
          return false;
        }

        let root = _.first(relative.split('/'));
        if (root?.startsWith('@')) {
          root = root + '/' + relative.split('/')[1];
        }
        root = root || '';

        const packageJsonAbsPath = crossPlatformPath([
          this.cwd,
          config.folder.node_modules,
          relative,
          'package.json',
        ]);
        const packageJsonExtractedName =
          Helpers.readJsonC(packageJsonAbsPath)?.name;

        return (
          packageJsonExtractedName === packageNameForDuplicationRemoval &&
          root !== packageNameForDuplicationRemoval &&
          _.first(root.split('/')) !== config.folder._bin &&
          fse.existsSync(packageJsonAbsPath)
        );
      });

      // console.log({ duplicates });

      duplicates.forEach(duplicatePathAbs => {
        const pathParts = duplicatePathAbs.split('/').filter(Boolean);

        const nodeModulesIndex = pathParts.lastIndexOf('node_modules');

        let parentName: string;

        if (pathParts[nodeModulesIndex - 2]?.startsWith('@')) {
          parentName = pathParts[nodeModulesIndex - 2];
        } else {
          parentName = pathParts[nodeModulesIndex - 1];
        }

        if (!Helpers.exists(duplicatePathAbs)) {
          Helpers.warn(`Skipping non-existing path: ${duplicatePathAbs}`);
          return;
        }

        if (
          excludeFrom.some(rule => parentName.includes(rule.replace('!', '')))
        ) {
          Helpers.warn(
            `Skipping removal of ${packageNameForDuplicationRemoval} from excluded parent: ${parentName}`,
          );
          return;
        }

        if (
          includeOnlyIn.length > 0 &&
          !includeOnlyIn.some(rule =>
            parentName.includes(rule.replace('*', '')),
          )
        ) {
          Helpers.warn(
            `Skipping removal of ${packageNameForDuplicationRemoval} from non-included parent: ${parentName}`,
          );
          return;
        }

        if (countOnly) {
          Helpers.info(`Found duplicate ${packageNameForDuplicationRemoval}`);
        } else {
          Helpers.info(`Removing path ${duplicatePathAbs}`);
          if (!fake) {
            Helpers.removeSymlinks(duplicatePathAbs);
            Helpers.remove(duplicatePathAbs);
          }
          // Helpers.info(
          //   `Removed duplicate ${packageNameForDuplicationRemoval} `,
          // );
        }
      });
    }

    Helpers.taskDone(`${countOnly ? 'Counting' : 'Removing'} duplicates done.`);
    //#endregion
  }

  //#endregion
}
