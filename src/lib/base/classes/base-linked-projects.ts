//#region import
import { load } from 'json10-writer/src';
import { config } from 'tnp-core/src';
import { _, chalk, crossPlatformPath, path, UtilsTerminal } from 'tnp-core/src';

import {
  Helpers,
  LinkedPorjectsConfig,
  LinkedProject,
  UtilsTypescript,
} from '../../index';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
//#endregion

export class BaseLinkedProjects<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  private cache: any = {};

  //#region methods & getters / embedded project
  get embeddedProject(): PROJECT {
    const cacheKey = 'embeddedProject' + _.kebabCase(this.project.location);
    if (!_.isUndefined(this.cache[cacheKey])) {
      return this.cache[cacheKey];
    }
    // Helpers.taskStarted(`Detecting embedded project for ${this.location}`); // TODO it is slow
    const nearsetProj = this.project.ins.nearestTo(
      crossPlatformPath([this.project.location, '..']),
    ) as PROJECT;
    const linkedPorj = nearsetProj?.linkedProjects?.linkedProjects.find(l => {
      const copareTo = crossPlatformPath([
        nearsetProj.location,
        l.relativeClonePath,
      ]);
      if (this.project.location === copareTo) {
        return true;
      }
      if (l.remoteUrl() === this.project.git.originURL) {
        return true;
      }
      return false;
    });
    if (!linkedPorj || !linkedPorj.internalRealtiveProjectPath) {
      return;
    }
    const pathToEmbededProj = crossPlatformPath([
      nearsetProj.location,
      linkedPorj.relativeClonePath,
      linkedPorj.internalRealtiveProjectPath || '',
    ]);
    const embdedresult = this.project.ins.From(pathToEmbededProj) as PROJECT;
    // Helpers.taskDone(`Embedded project detected for ${this.location}`);
    this.cache[cacheKey] = embdedresult;
    return this.cache[cacheKey];
  }
  //#endregion

  //#region methods & getters / projects db location
  get projectsDbLocation() {
    //#region @backendFunc
    return this.project.ins.projectsDb.projectsDbLocation;
    //#endregion
  }
  //#endregion

  //#region methods & getters / save location to db
  async saveLocationToDB() {
    //#region @backendFunc
    const db = await this.project.ins.projectsDb.getConnection();

    const existed = db.data.projects.find(
      f => f.location === this.project.location,
    );
    // Helpers.info(`Saving location to db for ${this.genericName}, exised: ${!!existed}`);
    if (!existed) {
      try {
        await db.update(data => {
          if (data.projects.length > 50) {
            data.projects.shift();
          }
          data.projects.push({
            location: this.project.location,
          });
        });
        // Helpers.info(`Location saved to db for ${this.genericName}, db: ${this.ins.projectsDbLocation(_.kebabCase(this.cliToolName))}`);
      } catch (error) {
        Helpers.warn(`Cannot save location to db`);
      }
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters / save all linked projects to db
  async saveAllLinkedProjectsToDB() {
    const proj = this.project;
    await proj.linkedProjects.saveLocationToDB();
    for (const link of proj.linkedProjects.linkedProjects) {
      const linkedPorj = this.project.ins.From([
        proj.location,
        link.relativeClonePath,
        link.internalRealtiveProjectPath || '',
      ]) as PROJECT;
      // console.log({ linkedPorj })
      if (linkedPorj) {
        await linkedPorj.linkedProjects.saveLocationToDB();
      } else {
        Helpers.warn(`
          In project ${proj.genericName}

          Folder ${link.relativeClonePath} is missing projects...

          `);
      }
    }
  }
  //#endregion

  //#region methods & getters  / add linked project
  addLinkedProject(
    linkedProj: LinkedProject | string,
    options?: { skipFormat?: boolean },
  ) {
    //#region @backendFunc
    options = options || {};
    const linkedProject: LinkedProject = _.isString(linkedProj)
      ? LinkedProject.fromName(linkedProj)
      : linkedProj;

    const linkedProjectsConfig = this.getLinkedProjectsConfig();
    const linkedProjectToAdd = LinkedProject.from(linkedProject);

    const newProjRemoteHttpUrl = Helpers.git.originSshToHttp(
      linkedProjectToAdd.remoteUrl(),
    );
    const newProjRemoteSshUrl = Helpers.git.originHttpToSsh(
      linkedProjectToAdd.remoteUrl(),
    );

    const httpExists = linkedProjectsConfig.projects.some(
      p =>
        p.repoUrlHttp === newProjRemoteHttpUrl &&
        p.relativeClonePath === linkedProjectToAdd.relativeClonePath,
    );

    const sshExists = linkedProjectsConfig.projects.some(
      p =>
        p.repoUrlSsh === newProjRemoteSshUrl &&
        p.relativeClonePath === linkedProjectToAdd.relativeClonePath,
    );

    if (httpExists || sshExists) {
      Helpers.warn(
        `[${config.frameworkName}-helpers][linked-projects] ` +
          `Project "${linkedProjectToAdd.remoteUrl()}" ` +
          `already exists in linked projects`,
      );
      return;
    }

    linkedProjectsConfig.projects.push(linkedProjectToAdd);
    this.setLinkedProjectsConfig(linkedProjectsConfig, options);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / add linked projects
  addLinkedProjects(
    linkedProjs: LinkedProject[],
    options?: { skipFormat?: boolean },
  ) {
    //#region @backendFunc
    options = options || {};
    for (const linkedProj of linkedProjs) {
      this.addLinkedProject(linkedProj, options);
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / set linked projects config
  setLinkedProjectsConfig(
    linkedPorjectsConfig: Partial<LinkedPorjectsConfig>,
    options?: {
      skipFormat?: boolean;
    },
  ) {
    //#region @backendFunc
    options = options || {};
    if (!Helpers.exists(this.linkedProjectsConfigPath)) {
      return;
    }
    const orgContent = Helpers.readFile(this.linkedProjectsConfigPath);
    const tmpJson = Helpers.readJson(this.linkedProjectsConfigTempPath);
    linkedPorjectsConfig = LinkedPorjectsConfig.from(linkedPorjectsConfig);

    if (!Helpers.exists(this.linkedProjectsConfigTempPath)) {
      Helpers.writeJson(
        this.linkedProjectsConfigTempPath,
        linkedPorjectsConfig,
      );
    }

    const jsonsAreEqual = _.isEqual(
      tmpJson,
      JSON.parse(JSON.stringify(linkedPorjectsConfig)),
    );
    if (jsonsAreEqual) {
      // linked projects.json only save/formatted when changed
      return;
    }

    const writer = load(orgContent);
    writer.write(linkedPorjectsConfig);

    const newContent = writer.toSource({
      quote: 'double',
      trailingComma: true,
      quotaKey: true,
    });

    Helpers.writeJson(this.linkedProjectsConfigTempPath, linkedPorjectsConfig);
    Helpers.writeFile(this.linkedProjectsConfigPath, newContent);
    // TODO to many formatting request because of jsonc
    if (!options.skipFormat) {
      this.formatConfigFile();
    }
    //#endregion
  }
  //#endregion

  public formatConfigFile() {
    //#region @backendFunc
    UtilsTypescript.formatFile(this.linkedProjectsConfigPath);
    //#endregion
  }

  //#region methods & getters  / get linked projects config path
  private get linkedProjectsConfigPath() {
    return this.project.pathFor(config.file.linked_projects_json);
  }

  private get linkedProjectsConfigTempPath() {
    return this.project.pathFor([`tmp-${config.file.linked_projects_json}`]);
  }
  //#endregion

  //#region methods & getters  / recreate linked projects config
  protected recreateLinkedProjectsConfig() {
    //#region @backendFunc
    if (
      !Helpers.exists(this.linkedProjectsConfigPath) &&
      Helpers.exists(this.project.pathFor(config.file.taon_jsonc))
    ) {
      Helpers.writeJson(
        this.linkedProjectsConfigPath,
        LinkedPorjectsConfig.from({ projects: [] }),
      );
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / get linked projects config
  getLinkedProjectsConfig(): LinkedPorjectsConfig {
    //#region @backendFunc
    this.recreateLinkedProjectsConfig();
    const existedConfig = Helpers.readJson(
      this.project.pathFor(config.file.linked_projects_json),
      {},
      true,
    );
    const orgExistedConfig = _.cloneDeep(existedConfig);
    // console.log({ existedConfig });
    let linkedPorjectsConfig = LinkedPorjectsConfig.from(existedConfig);
    const currentRemoteUrl = this.project.git.originURL || '';
    const currentBranch = this.project.git.currentBranchName;

    linkedPorjectsConfig.projects = (linkedPorjectsConfig.projects || []).map(
      (projOrProjName: LinkedProject) => {
        if (_.isString(projOrProjName)) {
          return LinkedProject.fromName(
            projOrProjName,
            currentRemoteUrl,
            currentBranch,
          );
        }
        if (!projOrProjName.relativeClonePath) {
          projOrProjName.relativeClonePath = path
            .basename(projOrProjName.remoteUrl())
            .replace('.git', '');
        }
        projOrProjName = LinkedProject.from(projOrProjName);
        if (
          !projOrProjName.remoteUrl() &&
          currentRemoteUrl &&
          Helpers.git.isValidRepoUrl(currentRemoteUrl)
        ) {
          projOrProjName.repoUrl = currentRemoteUrl.replace(
            path.basename(currentRemoteUrl),
            `${projOrProjName.relativeClonePath}.git`,
          );
        }
        return projOrProjName;
      },
    );
    // console.log({ linkedPorjectsConfig })
    // @ts-ignore
    linkedPorjectsConfig.projects = Helpers.uniqArray<LinkedProject>(
      linkedPorjectsConfig.projects,
      'relativeClonePath',
    );
    if (!_.isEqual(orgExistedConfig, linkedPorjectsConfig)) {
      this.setLinkedProjectsConfig(linkedPorjectsConfig);
    }
    return linkedPorjectsConfig;
    //#endregion
  }
  //#endregion

  //#region methods & getters  / linked projects
  get linkedProjects(): LinkedProject[] {
    return this.getLinkedProjectsConfig().projects || [];
  }
  //#endregion

  //#region methods & getters  / detected linked projects
  get detectedLinkedProjects(): LinkedProject[] {
    const detectedLinkedProjects = LinkedProject.detect(
      this.project.location,
      { recursive: true }, // TOOD fix recrusive
    );
    return detectedLinkedProjects;
  }
  //#endregion

  //#region methods & getters  / linked projects prefix
  get linkedProjectsPrefix() {
    return this.getLinkedProjectsConfig().prefix;
  }
  //#endregion

  //#region getters & methods / reset linked projects only to core branches
  resetLinkedProjectsOnlyToCoreBranches() {
    return false;
  }
  //#endregion

  //#region getters & methods / get unexisted projects
  async cloneNonexistedLinkedProjects(setOrigin: 'ssh' | 'http') {
    //#region @backendFunc
    const detectedLinkedProjects = this.detectedLinkedProjects;

    if (!this.project.isMonorepo) {
      const projectsThatShouldBeLinked = this.linkedProjects
        .map(linkedProj => {
          return detectedLinkedProjects.find(
            f => f.relativeClonePath === linkedProj.relativeClonePath,
          )
            ? void 0
            : linkedProj;
        })
        .filter(f => !!f) as LinkedProject[];

      if (projectsThatShouldBeLinked.length > 0) {
        Helpers.info(`
    Missing linked projects detected..

          `);

        Helpers.info(`

${projectsThatShouldBeLinked
  .map(
    (p, index) =>
      `- ${index + 1}. ${chalk.bold(p.relativeClonePath)} ` +
      `${p.remoteUrlTransformed(setOrigin)} ` +
      `${p.purpose ? `{ purpose: ${p.purpose} }` : ''}`,
  )
  .join('\n')}

        `);

        if (projectsThatShouldBeLinked.length === 0) {
          return;
        }

        const optionsClone = {
          cloneAndContinue: {
            name: 'Clone missing projects and continue',
          },
          cloneAndExit: {
            name: 'Clone missing projects and exit process',
          },
          exit: {
            name: 'Exit process',
          },
        };

        const res = await UtilsTerminal.select<keyof typeof optionsClone>({
          choices: optionsClone,
          question: `What do you want to do with missing linked projects ?`,
        });

        if (res === 'cloneAndContinue' || res === 'cloneAndExit') {
          for (const linkedProj of projectsThatShouldBeLinked) {
            // console.log({linkedProj})
            Helpers.info(
              `Cloning unexisted project from url ` +
                `${chalk.bold(linkedProj.remoteUrlTransformed(setOrigin))} ` +
                `to ${linkedProj.relativeClonePath}`,
            );
            await this.project.git.clone(
              linkedProj.remoteUrlTransformed(setOrigin),
              linkedProj.relativeClonePath,
              linkedProj.defaultBranch,
            );
            const childProjLocaiton = this.project.pathFor([
              linkedProj.relativeClonePath,
              linkedProj.internalRealtiveProjectPath,
            ]);
            const childProj = this.project.ins.From(
              childProjLocaiton,
            ) as PROJECT;
            if (childProj) {
              await childProj.linkedProjects.saveLocationToDB();
            }
          }
        }

        if (res === 'cloneAndExit' || res === 'exit') {
          Helpers.info(`Exiting process...`);
          process.exit(0);
        }
      }
    }
    //#endregion
  }
  //#endregion
}
