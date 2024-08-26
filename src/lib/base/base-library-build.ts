//#region import
//#region @backend
import { chalk } from 'tnp-core/src';
export { ChildProcess } from 'child_process';
//#endregion
import { CoreModels } from 'tnp-core/src';
import { path, crossPlatformPath } from 'tnp-core/src';
import { config, FilesNames } from 'tnp-config/src';
import { _ } from 'tnp-core/src';
import { BaseFeatureForProject } from './base-feature-for-project';
import { Helpers, UtilsTerminal } from '../index';
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
  PROJCET extends BaseProject<any, any>,
> extends BaseFeatureForProject {
  private cache: any = {};

  //#region getters & methods / sort by deps
  protected sortByDeps(libraries: PROJCET[]): PROJCET[] {
    //#region @backendFunc
    const libs = libraries;

    const sorted = this.project.ins.sortGroupOfProject<PROJCET>(
      libs,
      proj => {
        // resolve dependencies names
        if (!_.isUndefined(proj.cache['deps'])) {
          return proj.cache['deps'];
        }
        const allLibs = Object.keys(proj.npmHelpers.allDependencies);
        proj.cache['deps'] = allLibs.filter(
          f => !_.isUndefined(libs.find(c => c.name === f)),
        );
        return proj.cache['deps'];
      },
      proj => {
        // resolve name to compare
        if (!_.isUndefined(proj.cache['nameToCompare'])) {
          return proj.cache['nameToCompare'];
        }
        proj.cache['nameToCompare'] = proj.name;
        return proj.cache['nameToCompare'];
      },
    );
    return sorted;
    //#endregion
  }
  //#endregion

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
  async selectAndSaveLibraries(
    // this: {},
    {
      selectedLibs,
      watch,
      watchBuildSupported,
      skipAllLibsQuestion,
      useLastUserConfiguration,
    }: {
      selectedLibs: PROJCET[];
      watch: boolean;
      watchBuildSupported?: boolean;
      skipAllLibsQuestion?: boolean;
      useLastUserConfiguration?: boolean;
    },
  ): Promise<{ selectedLibs: PROJCET[]; skipRebuildingAllForWatch: boolean }> {
    //#region @backendFunc
    let buildAll = false;
    let skipRebuildingAllForWatch = false;
    if (selectedLibs.length <= 1) {
      return { selectedLibs, skipRebuildingAllForWatch };
    }
    if (_.isUndefined(watchBuildSupported)) {
      watchBuildSupported = true;
    }

    const lastSelected: string[] =
      Helpers.readJson(this.project.pathFor(FilesNames.tmpLastSelectedJsonFile))
        ?.lastSelected || [];

    if (_.isArray(lastSelected) && lastSelected.length > 0) {
      const selected = lastSelected
        .map(c => selectedLibs.find(l => l.name == c))
        .filter(c => !!c);

      Helpers.info(`
Last selected libs

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

            `);
      if (
        useLastUserConfiguration
          ? true
          : await Helpers.consoleGui.question.yesNo(
              `Continue ${watch ? 'watch' : ''} build with last selected ?`,
            )
      ) {
        selectedLibs = selected as any;
        // TODO maybe safe about skip
        if ((watchBuildSupported && watch) || useLastUserConfiguration) {
          skipRebuildingAllForWatch =
            useLastUserConfiguration ||
            (await Helpers.consoleGui.question.yesNo(
              `Skip rebuilding all libraries for watch mode ?`,
            ));
        }
        return { selectedLibs, skipRebuildingAllForWatch };
      }
    }

    // more than 6 libs can be hard to manage in watch mode
    if (!watch || (watch && selectedLibs.length < 6)) {
      if (!skipAllLibsQuestion) {
        buildAll = await Helpers.consoleGui.question.yesNo(
          `Should all libraries be included in${watch ? ' watch' : ' '}build ?`,
        );
      }
    }

    if (buildAll) {
      return { selectedLibs, skipRebuildingAllForWatch };
    }
    while (true) {
      const defaultSelected = lastSelected
        .map(c => selectedLibs.find(l => l.name == c))
        .filter(c => !!c)
        .map(c => c.name);

      const pickedLibs = (
        await UtilsTerminal.multiselect({
          question: `Select libraries to ${watch ? 'watch' : ''} build `,
          choices: selectedLibs.map(c => {
            return { name: c.name, value: c.name, selected: true };
          }),
          defaultSelected,
        })
      ).map(c => selectedLibs.find(l => l.name == c));

      // console.log({ pickedLibs });

      const selected = pickedLibs.filter(c => {
        // if (!!c) { // TODO QUICK_FIX
        //   this.project.removeFile(lastSelectedJsonFile);
        //   Helpers.warn(`Please restart this command`);
        //   process.exit(0);
        // }
        return !!c;
      });

      Helpers.info(`

${selected.map((c, i) => `${i + 1}. ${c.basename} ${chalk.bold(c.name)}`).join('\n')}

      `);
      if (
        await Helpers.consoleGui.question.yesNo(
          `Continue build with ${selected.length} selected ?`,
        )
      ) {
        selectedLibs = selected as any;
        break;
      }
    }

    Helpers.writeJson(
      this.project.pathFor(FilesNames.tmpLastSelectedJsonFile),
      {
        lastSelected: selectedLibs.map(c => c.name),
      },
    );
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
    const libraries = this.getLibraries();
    this.cache['libraries'] = libraries;
    return libraries as any;
    //#endregion
  }
  protected getLibraries() {
    //#region @backendFunc
    const projects = (
      Object.values(
        Helpers.readJson(this.project.pathFor(config.file.angular_json))
          ?.projects || {},
      ) as NgProject[]
    ).filter(f => f.projectType === 'library');

    let libraries = projects.map(c =>
      this.project.ins.From(path.join(this.project.location, c.root)),
    ) as PROJCET[];

    libraries = this.sortByDeps(libraries);
    return libraries;
    //#endregion
  }
  //#endregion

  //#region getters & methods / build libraries
  /**
   * Angular library build
   */
  public async buildLibraries(
    // this:{},
    {
      watch = false,
      strategy,
      releaseBuild = false,
      buildType,
      copylink_to_node_modules,
      outputLineReplace,
      libraries,
      useLastUserConfiguration,
    }: LibrariesBuildOptions<PROJCET> & { watch?: boolean } = {} as any,
  ): Promise<void> {
    //#region @backend

    await this.project.linkedProjects.saveAllLinkedProjectsToDB();

    //#region prepare parameters
    if (!Array.isArray(copylink_to_node_modules)) {
      copylink_to_node_modules = [];
    }
    if (!strategy) {
      strategy = 'link';
    }
    //#endregion

    //#region select target node_modules
    const useExternalProvidedLibs = !_.isNil(libraries);
    const allLibs = useExternalProvidedLibs ? libraries : this.libraries;

    const locationsForNodeModules = releaseBuild
      ? []
      : [
          this.project.pathFor(config.folder.node_modules),
          ...copylink_to_node_modules,
          ...(!useExternalProvidedLibs
            ? []
            : Helpers.uniqArray(
                libraries.map(c =>
                  c.parent.pathFor(config.folder.node_modules),
                ),
              )),
        ];
    //#endregion

    //#region select libs to build
    const { selectedLibs, skipRebuildingAllForWatch } =
      await this.selectAndSaveLibraries({
        selectedLibs: libraries ? libraries : allLibs,
        watch,
        skipAllLibsQuestion: useExternalProvidedLibs,
        useLastUserConfiguration,
      });
    //#endregion

    //#region normal build
    const allParenProjsForExtenalLibsBuild: PROJCET[] = useExternalProvidedLibs
      ? Helpers.uniqArray<PROJCET>(
          libraries.map(c => c.parent),
          'location',
        )
      : [this.project as any];

    // console.log(
    //   'SORTED PROJECTS',
    //   additionalLibsProjs.map(c => c.name),
    // );

    // TODO @LAST sort additionalLibsProjs thing before ric
    for (const libProj of allParenProjsForExtenalLibsBuild) {
      await libProj.init();

      for (const [index, lib] of libProj.libraryBuild.libraries.entries()) {
        if (watch && skipRebuildingAllForWatch) {
          Helpers.info(
            `Skipping build for watch mode (${index + 1}/${allLibs.length})` +
              ` ${lib.basename} (${chalk.bold(lib.name)})`,
          );
          continue;
        }
        Helpers.info(
          `Building (${index + 1}/${allLibs.length}) ${lib.basename}` +
            ` (${chalk.bold(lib.name)})`,
        );

        await libProj.libraryBuild.libNormalBuildProcess({
          lib,
          locationsForNodeModules: useExternalProvidedLibs
            ? [
                this.project.pathFor(config.folder.node_modules),
                libProj.pathFor(config.folder.node_modules),
              ]
            : locationsForNodeModules,
          strategy,
          buildType,
          outputLineReplace: outputLineReplace(
            lib as any,
            useExternalProvidedLibs,
          ),
        });
      }
    }
    //#endregion

    //#region watch build
    for (const [index, lib] of selectedLibs.entries()) {
      Helpers.info(
        `Building for watch (${index + 1}/${selectedLibs.length}) ` +
          `${lib.basename} (${chalk.bold(lib.name)})`,
      );

      await this.libWatchBuildProcess({
        lib,
        locationsForNodeModules,
        strategy,
        buildType,
        outputLineReplace: outputLineReplace(lib, useExternalProvidedLibs),
      });
    }
    //#endregion

    //#region success message
    if (watch) {
      Helpers.success('BUILD DONE.. watching..');
    } else {
      // await this.__indexRebuilder.start({ taskName: 'index rebuild watch' });
      Helpers.success('BUILD DONE');
    }
    //#endregion

    //#endregion
  }
  //#endregion

  //#region getters & methods / lib watch build process
  protected async libWatchBuildProcess({
    lib,
    locationsForNodeModules,
    strategy,
    buildType,
    outputLineReplace,
  }: {
    lib: PROJCET;
    locationsForNodeModules: string[];
    strategy: 'link' | 'copy';
    buildType: CoreModels.LibraryType;
    outputLineReplace?: (outputLine: string) => string;
  }) {
    //#region @backendFunc

    //#region debouce copy/link
    const debouncedBuild = _.debounce(() => {
      const sourceDist = lib.parent.pathFor([config.folder.dist, lib.basename]);
      for (const node_modules of locationsForNodeModules) {
        const dest = crossPlatformPath([node_modules, lib.name]);
        if (Helpers.isSymlinkFileExitedOrUnexisted(dest)) {
          Helpers.remove(dest);
        }
        Helpers.copy(sourceDist, dest);
        // console.log({ sourceDist, dest });
        console.log(
          `Sync (watch) done for ${lib.basename} to ${lib.name} (${crossPlatformPath(
            [
              path.basename(path.dirname(node_modules)),
              config.folder.node_modules,
            ],
          )})`,
        );
      }
    }, 500);
    //#endregion

    //#region watch build process
    await (lib.parent as BaseProject).execute(
      lib.libraryBuild.getLibraryBuildComamnd({
        watch: true,
        buildType,
      }),
      {
        outputLineReplace,
        resolvePromiseMsg: {
          stdout: lib.libraryBuild.getLibraryBuildSuccessComamnd,
        },
        resolvePromiseMsgCallback: {
          stdout: () => {
            if (strategy === 'copy') {
              debouncedBuild();
            }
          },
        },
      },
    );
    //#endregion

    //#endregion
  }
  //#endregion

  //#region getters & methods / lib normal build process
  protected async libNormalBuildProcess({
    lib,
    locationsForNodeModules,
    strategy,
    buildType,
    outputLineReplace,
  }: {
    lib: PROJCET;
    locationsForNodeModules: string[];
    strategy: 'link' | 'copy';
    buildType: CoreModels.LibraryType;
    outputLineReplace?: (outputLine: string) => string;
  }) {
    //#region @backendFunc

    const libCompiledInDist = lib.parent.pathFor([
      config.folder.dist,
      lib.basename,
    ]);

    //#region compile process
    const compileProcess = async () => {
      if (!Helpers.exists(libCompiledInDist)) {
        Helpers.info(`Compiling ${lib.name} ...`);
        await (lib.parent as PROJCET).execute(
          lib.libraryBuild.getLibraryBuildComamnd({
            watch: false,
            buildType,
          }),
          {
            resolvePromiseMsg: {
              stdout: lib.libraryBuild.getLibraryBuildSuccessComamnd,
            },
            outputLineReplace,
          },
        );
      }
    };
    //#endregion

    if (strategy === 'link') {
      //#region link dist to node_modules

      for (const node_modules_abs_path of locationsForNodeModules) {
        const libInsideNodeModules = crossPlatformPath([
          node_modules_abs_path,
          lib.name,
        ]);
        if (!Helpers.isSymlinkFileExitedOrUnexisted(libInsideNodeModules)) {
          Helpers.remove(libInsideNodeModules);
        }
        // console.log('linking from ', sourceDist);
        // console.log('linking to ', dest);
        // Helpers.remove(dest);
        Helpers.createSymLink(libCompiledInDist, libInsideNodeModules, {
          continueWhenExistedFolderDoesntExists: true,
        });
        console.log(
          `Sync (link) done for ${lib.basename} to ${lib.name} (${crossPlatformPath(
            [
              path.basename(path.dirname(node_modules_abs_path)),
              config.folder.node_modules,
            ],
          )})`,
        );
      }
      await compileProcess();

      //#endregion
    } else if (strategy === 'copy') {
      //#region copy dist to node_modules
      await compileProcess();
      for (const node_modules_abs_path of locationsForNodeModules) {
        const libInsideNodeModules = crossPlatformPath([
          node_modules_abs_path,
          lib.name,
        ]);
        if (Helpers.isSymlinkFileExitedOrUnexisted(libInsideNodeModules)) {
          Helpers.remove(libInsideNodeModules);
        }
        Helpers.copy(libCompiledInDist, libInsideNodeModules);
        console.log(
          `Sync done for ${lib.basename} to ${lib.name} (${crossPlatformPath([
            path.basename(path.dirname(node_modules_abs_path)),
            config.folder.node_modules,
          ])})`,
        );
      }
      //#endregion
    }
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

  //#region getters & methods / select copy to projects
  async selectCopytoProjects(): Promise<string[]> {
    //#region @backendFunc
    const projects = (
      this.project.ins.allProjectsFromFolder(
        path.dirname(this.project.location),
      ) as BaseProject[]
    )
      .filter(c => c.location !== this.project.location)
      .map(p =>
        p.linkedProjects?.embeddedProject
          ? p.linkedProjects.embeddedProject
          : p,
      );

    const locations = await Helpers.consoleGui.multiselect(
      'Copy compiled version to projects',
      projects.map(c => {
        return {
          name: c.genericName,
          value: c.pathFor(config.folder.node_modules),
        };
      }),
      true,
    );
    return locations;
    //#endregion
  }
  //#endregion
}
