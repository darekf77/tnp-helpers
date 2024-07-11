//#region import
//#region @backend
import { chalk } from 'tnp-core/src';
export { ChildProcess } from 'child_process';
//#endregion
import { path, crossPlatformPath } from 'tnp-core/src';
import { config } from 'tnp-config/src';
import { _ } from 'tnp-core/src';
import { BaseFeatureForProject } from './base-feature-for-project';
import { Helpers } from '../index';
import {
  LibrariesBuildOptions,
  LibraryBuildCommandOptions,
  NgProject,
} from '../models';
import type { BaseProject } from './base-project';
//#endregion

/**
 * Base library build for standard angular/typescript projects
 */
export class BaseLibraryBuild<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  private cache: any = {};

  //#region getters & methods / sorted libraries by deps
  public get sortedLibrariesByDeps(): PROJCET[] {
    //#region @backendFunc
    const libs = this.libraries;
    const sorted = this.project.ins.sortGroupOfProject<PROJCET>(
      libs,
      proj => {
        if (!_.isUndefined(this.cache['deps'])) {
          return this.cache['deps'];
        }

        const uiJsonPath = proj.pathFor('ui-module.json');
        if (Helpers.exists(uiJsonPath)) {
          const uiModuleJson = Helpers.readJson(uiJsonPath);
          const allLibs = (uiModuleJson.dependencies || []) as string[];
          this.cache['deps'] = allLibs.filter(
            f => !_.isUndefined(libs.find(c => c.basename === f)),
          );
        } else {
          const allLibs = Object.keys(proj.npmHelpers.allDependencies);
          this.cache['deps'] = allLibs.filter(
            f => !_.isUndefined(libs.find(c => c.name === f)),
          );
        }

        // console.log(`${proj.name} => all libs`, this.cache['deps'])
        return this.cache['deps'];
      },
      proj => {
        if (!_.isUndefined(this.cache['nameToCompare'])) {
          // console.log(`CACHE ${proj.basename} => name: ` + this.cache['nameToCompare'])
          return this.cache['nameToCompare'];
        }
        this.cache['nameToCompare'] = Helpers.exists(
          proj.pathFor('ui-module.json'),
        )
          ? proj.basename
          : proj.name;
        return this.cache['nameToCompare'];
      },
    );

    return sorted;
    //#endregion
  }
  //#endregion

  //#region getters & methods / get sorted libraries by deps for build
  async getSortedLibrariesByDepsForBuild(
    libs: PROJCET[],
    dontSugestBuildAll = false,
  ): Promise<PROJCET[]> {
    //#region @backendFunc

    let buildAll = false;
    const lastSelectedJsonFile = 'tmp-last-selected.json';
    const lastSelected =
      Helpers.readJson(this.project.pathFor(lastSelectedJsonFile))
        ?.lastSelected || [];

    if (_.isArray(lastSelected) && lastSelected.length > 0) {
      const selected = lastSelected.map(c => libs.find(l => l.basename == c));

      Helpers.info(`
Last selected libs

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

            `);
      if (
        await Helpers.consoleGui.question.yesNo(
          `Continue watch build with last selected ?`,
        )
      ) {
        libs = selected;
        return libs;
      }
    }

    if (libs.length < 6 && !dontSugestBuildAll) {
      buildAll = await Helpers.consoleGui.question.yesNo(
        'Should all libraries be included in watch build ?',
      );
    }
    if (buildAll) {
      return libs;
    }
    while (true) {
      const selectedLibs = await Helpers.consoleGui.multiselect(
        `Select libraries to build watch `,
        libs.map(c => {
          return { name: c.name, value: c.name, selected: true };
        }),
        true,
      );
      const selected = selectedLibs.map(c => libs.find(l => l.name == c));
      Helpers.info(`

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

      `);
      if (
        await Helpers.consoleGui.question.yesNo(
          `Continue build with ${selected.length} selected ?`,
        )
      ) {
        libs = selected;
        break;
      }
    }

    Helpers.writeJson(this.project.pathFor(lastSelectedJsonFile), {
      lastSelected: libs.map(c => c.basename),
    });
    return libs;
    //#endregion
  }
  //#endregion

  //#region getters & methods / angular libraries
  /**
   * angular libraries from angular.json
   */
  get libraries(): PROJCET[] {
    //#region @backendFunc
    if (!_.isUndefined(this.cache['libraries'])) {
      return this.cache['libraries'];
    }
    if (!this.project.pathExists(config.file.angular_json)) {
      const externalPath = path.join(
        this.project.location,
        config.folder.projects,
      );
      const libraries = Helpers.findChildren<PROJCET>(
        externalPath,
        childLocation => {
          const childProject = this.project.ins.From(childLocation);
          if (childProject?.name === this.project.name) {
            return void 0;
          }
          return childProject;
        },
        { allowAllNames: true },
      );

      this.cache['libraries'] = libraries;
      return libraries;
    }
    const projects = (
      Object.values(
        Helpers.readJson(this.project.pathFor(config.file.angular_json))
          ?.projects || {},
      ) as NgProject[]
    ).filter(f => f.projectType === 'library');

    const libraries = projects.map(c =>
      this.project.ins.From(path.join(this.project.location, c.root)),
    );
    this.cache['libraries'] = libraries;
    return libraries;
    //#endregion
  }
  //#endregion

  //#region getters & methods / selected libraries
  async selectLibraries({ onlySelectedLibs }: { onlySelectedLibs: string[] }) {
    //#region @backendFunc
    const allLibs = this.libraries;
    const allLibsToBuild = this.sortedLibrariesByDeps.filter(f => {
      if (!onlySelectedLibs) {
        return true;
      }
      const nameMatchesPattern = onlySelectedLibs.find(c => f.name.includes(c));
      const basenameMatchesPattern = onlySelectedLibs.find(c =>
        f.basename.includes(c),
      );
      return nameMatchesPattern || basenameMatchesPattern;
    });

    const libsToBuild = this.sortedLibrariesByDeps;
    let libsToWatch: PROJCET[] =
      allLibsToBuild.length == 1
        ? [_.first(allLibsToBuild)]
        : await this.getSortedLibrariesByDepsForBuild(
            allLibsToBuild,
            allLibs.length != allLibsToBuild.length,
          );

    return { libsToBuild, libsToWatch, allLibs };
    //#endregion
  }
  //#endregion

  //#region getters & methods / build libraries
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  public async buildLibraries(
    {
      rebuild = false,
      watch = false,
      strategy,
      onlySelectedLibs,
      buildType,
    }: LibrariesBuildOptions = {} as any,
  ) {
    //#region @backend
    await this.project.linkedProjects.saveAllLinkedProjectsToDB();
    if (!strategy) {
      strategy = 'link';
    }

    //#region select target node_modules
    const locationsForNodeModules = [
      this.project.location,
      // this.parent.location,
      // ...this.parent.children.map(c => c.location),
    ].map(l => crossPlatformPath([l, config.folder.node_modules]));
    await this.project.npmHelpers.makeSureNodeModulesInstalled();
    //#endregion

    const { libsToBuild, libsToWatch, allLibs } = await this.selectLibraries({
      onlySelectedLibs,
    });

    //#region normal build
    for (const [index, lib] of libsToBuild.entries()) {
      Helpers.info(
        `Building (${index + 1}/${allLibs.length}) ${lib.basename} (${chalk.bold(lib.name)})`,
      );

      if (strategy === 'link') {
        //#region link dist to node_modules
        (() => {
          const sourceDist = this.project.pathFor([
            config.folder.dist,
            lib.basename,
          ]);
          for (const node_modules of locationsForNodeModules) {
            const dest = crossPlatformPath([node_modules, lib.name]);
            if (!Helpers.isSymlinkFileExitedOrUnexisted(dest)) {
              Helpers.remove(dest);
            }
            // console.log('linking from ', sourceDist);
            // console.log('linking to ', dest);
            // Helpers.remove(dest);
            Helpers.createSymLink(sourceDist, dest, {
              continueWhenExistedFolderDoesntExists: true,
            });
          }

          if (rebuild || !Helpers.exists(sourceDist)) {
            Helpers.info(`Compiling ${lib.name} ...`);
            this.project
              .run(
                lib.libraryBuild.getLibraryBuildComamnd({
                  watch: false,
                  buildType,
                }),
                {
                  output: true,
                },
              )
              .sync();
          }
        })();

        (() => {
          const sourceDist = this.project.pathFor([
            config.folder.dist,
            lib.basename,
          ]);
          const dest = this.project.pathFor([
            config.folder.node_modules,
            lib.name,
          ]);
          if (!Helpers.isSymlinkFileExitedOrUnexisted(dest)) {
            Helpers.remove(dest);
          }
          Helpers.createSymLink(sourceDist, dest, {
            continueWhenExistedFolderDoesntExists: true,
          });
        })();
        //#endregion
      } else if (strategy === 'copy') {
        //#region copy dist to node_modules
        const sourceDist = this.project.pathFor([
          config.folder.dist,
          lib.basename,
        ]);
        const dest = this.project.pathFor([
          config.folder.node_modules,
          lib.name,
        ]);

        if (rebuild || !Helpers.exists(sourceDist)) {
          Helpers.info(`Compiling ${lib.name} ...`);
          this.project
            .run(
              lib.libraryBuild.getLibraryBuildComamnd({
                watch: false,
                buildType,
              }),
              {
                output: true,
              },
            )
            .sync();
        }

        if (Helpers.isSymlinkFileExitedOrUnexisted(dest)) {
          Helpers.remove(dest);
        }

        Helpers.copy(sourceDist, dest);
        //#endregion
      }
    }
    //#endregion

    //#region watch build
    if (watch) {
      for (const [index, lib] of libsToWatch.entries()) {
        Helpers.info(
          `Building for watch (${index + 1}/${libsToWatch.length}) ${lib.basename} (${chalk.bold(lib.name)})`,
        );
        await (async () => {
          await this.project
            .run(
              lib.libraryBuild.getLibraryBuildComamnd({
                watch: true,
                buildType,
              }),
              {
                output: true,
              },
            )
            .unitlOutputContains(
              lib.libraryBuild.getLibraryBuildSuccessComamnd,
              [],
              0,
              () => {
                const sourceDist = this.project.pathFor([
                  config.folder.dist,
                  lib.basename,
                ]);
                const dest = this.project.pathFor([
                  config.folder.node_modules,
                  lib.name,
                ]);
                Helpers.copy(sourceDist, dest);
                console.log(`Sync done for ${lib.basename} to ${lib.name}`);
              },
            );
        })();
      }
      // await this.__indexRebuilder.startAndWatch({ taskName: 'index rebuild watch' });
      Helpers.success('BUILD DONE.. watching..');
    } else {
      // await this.__indexRebuilder.start({ taskName: 'index rebuild watch' });
      Helpers.success('BUILD DONE');
    }
    //#endregion

    //#endregion
  }
  //#endregion

  //#region getters & methods / get library build success command
  getLibraryBuildComamnd(
    options?: LibraryBuildCommandOptions,
  ): string | undefined {
    //#region @backendFunc
    const { watch } = options;

    const isAngularLib =
      Helpers.exists(this.project.pathFor('ng-package.json')) ||
      Helpers.exists(this.project.pathFor('tsconfig.app.json'));
    if (isAngularLib) {
      return `npm-run ng build ${this.project.basename} ${watch ? '--watch' : ''}`;
    } else {
      return (
        `npm-run tsc -p libraries/${this.project.basename}/tsconfig.lib.json ` +
        ` ${watch ? '--watch' : ''} --preserveWatchOutput`
      );
    }
    //#endregion
  }
  //#endregion

  //#region getters & methods / get library build success command
  get getLibraryBuildSuccessComamnd(): string {
    //#region @backendFunc
    const isAngularLib = Helpers.exists(
      this.project.pathFor('ng-package.json'),
    );
    if (isAngularLib) {
      return `Trace: Build complete`;
    } else {
      return `Found 0 errors. Watching for file change`;
    }
    //#endregion
  }
  //#endregion
}
