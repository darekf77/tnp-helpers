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
export abstract class BaseLibraryBuild<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  private cache: any = {};

  //#region getters & methods / sort by deps
  protected sortByDeps(libraries: PROJCET[]): PROJCET[] {
    return libraries;
  }

  //#region getters & methods / get sorted libraries by deps for build\
  /**
   * Use cases:
   * 1. build all libraries in normal mode
   * 2. build all libraries in watch mode
   * 3. build selected libraries in normal mode
   *   (with first time all libraries will be build)
   * 4. build selected libraries in watch mode
   *    (use normal build for not selected libraries)
   * 5. build selected libraries in watch mode
   *    (skip normal build for not selected libraries)
   */
  async selectAndSaveLibraries({
    libs: selectedLibs,
    watch,
    watchBuildSupported,
  }: {
    libs: PROJCET[];
    watch: boolean;
    watchBuildSupported?: boolean;
  }): Promise<{ selectedLibs: PROJCET[]; skipRebuildingAllForWatch: boolean }> {
    //#region @backendFunc
    let buildAll = false;
    let skipRebuildingAllForWatch = false;
    if (selectedLibs.length <= 1) {
      return { selectedLibs, skipRebuildingAllForWatch };
    }
    if (_.isUndefined(watchBuildSupported)) {
      watchBuildSupported = true;
    }
    const lastSelectedJsonFile = 'tmp-last-selected.json';
    const lastSelected =
      Helpers.readJson(this.project.pathFor(lastSelectedJsonFile))
        ?.lastSelected || [];

    if (_.isArray(lastSelected) && lastSelected.length > 0) {
      const selected = lastSelected.map(c =>
        selectedLibs.find(l => l.basename == c),
      );

      Helpers.info(`
Last selected libs

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

            `);
      if (
        await Helpers.consoleGui.question.yesNo(
          `Continue ${watch ? 'watch' : ''} build with last selected ?`,
        )
      ) {
        selectedLibs = selected;
        if (watchBuildSupported && watch) {
          skipRebuildingAllForWatch = await Helpers.consoleGui.question.yesNo(
            `Skip rebuilding all libraries for watch mode ?`,
          );
        }
        return { selectedLibs, skipRebuildingAllForWatch };
      }
    }

    // more than 6 libs can be hard to manage in watch mode
    if (!watch || (watch && selectedLibs.length < 6)) {
      buildAll = await Helpers.consoleGui.question.yesNo(
        `Should all libraries be included in${watch ? ' watch' : ' '}build ?`,
      );
    }

    if (buildAll) {
      return { selectedLibs, skipRebuildingAllForWatch };
    }
    while (true) {
      const pickedLibs = await Helpers.consoleGui.multiselect(
        `Select libraries to ${watch ? 'watch' : ''} build `,
        selectedLibs.map(c => {
          return { name: c.name, value: c.name, selected: true };
        }),
        true,
      );
      const selected = pickedLibs.map(c => selectedLibs.find(l => l.name == c));
      Helpers.info(`

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

      `);
      if (
        await Helpers.consoleGui.question.yesNo(
          `Continue build with ${selected.length} selected ?`,
        )
      ) {
        selectedLibs = selected;
        break;
      }
    }

    Helpers.writeJson(this.project.pathFor(lastSelectedJsonFile), {
      lastSelected: selectedLibs.map(c => c.basename),
    });
    return { selectedLibs, skipRebuildingAllForWatch };
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
    const projects = (
      Object.values(
        Helpers.readJson(this.project.pathFor(config.file.angular_json))
          ?.projects || {},
      ) as NgProject[]
    ).filter(f => f.projectType === 'library');

    let libraries = projects.map(c =>
      this.project.ins.From(path.join(this.project.location, c.root)),
    );
    libraries = this.sortByDeps(libraries);
    this.cache['libraries'] = libraries;
    return libraries;
    //#endregion
  }
  //#endregion

  //#region getters & methods / selected libraries
  async selectLibraries({
    watch,
    watchBuildSupported,
  }: {
    watch: boolean;
    watchBuildSupported?: boolean;
  }) {
    //#region @backendFunc
    const allLibs = this.libraries;

    /**
     * all libraries to build
     */
    const { selectedLibs, skipRebuildingAllForWatch } =
      await this.selectAndSaveLibraries({
        libs: allLibs,
        watch,
        watchBuildSupported,
      });
    return {
      skipRebuildingAllForWatch,
      /**
       * libs selected for build
       */
      selectedLibs,
      /**
       * all libs that can be in build
       */
      allLibs,
    };
    //#endregion
  }
  //#endregion

  //#region getters & methods / build libraries
  /**
   * Angular library build
   */
  public async buildLibraries(
    {
      watch = false,
      strategy,
      buildType,
    }: LibrariesBuildOptions & { watch: boolean } = {} as any,
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

    const { selectedLibs, allLibs, skipRebuildingAllForWatch } =
      await this.selectLibraries({
        watch,
      });

    //#region normal build
    for (const [index, lib] of allLibs.entries()) {
      if (watch && skipRebuildingAllForWatch) {
        Helpers.info(
          `Skipping build for watch mode (${index + 1}/${allLibs.length}) ${lib.basename} (${chalk.bold(lib.name)})`,
        );
      }
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

          if (!Helpers.exists(sourceDist)) {
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

        if (!Helpers.exists(sourceDist)) {
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
      for (const [index, lib] of selectedLibs.entries()) {
        Helpers.info(
          `Building for watch (${index + 1}/${selectedLibs.length}) ` +
            `${lib.basename} (${chalk.bold(lib.name)})`,
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
