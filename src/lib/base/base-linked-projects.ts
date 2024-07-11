//#region import
//#region @backend
export { ChildProcess } from 'child_process';
import * as tsfmt from 'typescript-formatter';
//#endregion
import { _, chalk, crossPlatformPath, path } from 'tnp-core/src';
import { Helpers, LinkedPorjectsConfig, LinkedProject } from '../index';
import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
import * as json5Write from 'json10-writer/src';
import { config } from 'tnp-config/src';
//#endregion

export class BaseLinkedProjects<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  private cache: any = {};
  project: PROJCET;

  //#region methods & getters / embedded project
  get embeddedProject(): PROJCET {
    const cacheKey = 'embeddedProject' + _.kebabCase(this.project.location);
    if (!_.isUndefined(this.cache[cacheKey])) {
      return this.cache[cacheKey];
    }
    // Helpers.taskStarted(`Detecting embedded project for ${this.location}`); // TODO it is slow
    const nearsetProj = this.project.ins.nearestTo(
      crossPlatformPath([this.project.location, '..']),
    );
    const linkedPorj = nearsetProj?.linkedProjects?.find(l => {
      return (
        this.project.location ===
        crossPlatformPath([nearsetProj.location, l.relativeClonePath])
      );
    });
    if (!linkedPorj || !linkedPorj.internalRealtiveProjectPath) {
      return;
    }
    const pathToEmbededProj = crossPlatformPath([
      nearsetProj.location,
      linkedPorj.relativeClonePath,
      linkedPorj.internalRealtiveProjectPath || '',
    ]);
    const embdedresult = this.project.ins.From(pathToEmbededProj);
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
    const db = await this.project.ins.projectsDb.useDB();

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
        // Helpers.info(`Location saved to db for ${this.genericName}, db: ${this.ins.projectsDbLocation(_.kebabCase(this.orgName))}`);
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
      ]);
      // console.log({ linkedPorj })
      if (linkedPorj) {
        await linkedPorj.saveLocationToDB();
      } else {
        Helpers.warn(`Folder ${link.relativeClonePath} is missing projects...`);
      }
    }
  }
  //#endregion

  //#region methods & getters  / add linked project
  addLinkedProject(linkedProj: LinkedProject | string) {
    const linkedProject: LinkedProject = _.isString(linkedProj)
      ? LinkedProject.fromName(linkedProj)
      : linkedProj;
    //#region @backendFunc
    const linkedProjectsConfig = this.getLinkedProjectsConfig();
    linkedProjectsConfig.projects.push(LinkedProject.from(linkedProject));
    this.setLinkedProjectsConfig(linkedProjectsConfig);
    //#endregion
  }
  //#endregion

  //#region methods & getters  / add linked projects
  addLinkedProjects(linkedProjs: LinkedProject[]) {
    //#region @backendFunc
    for (const linkedProj of linkedProjs) {
      this.addLinkedProject(linkedProj);
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / set linked projects config
  setLinkedProjectsConfig(linkedPorjectsConfig: Partial<LinkedPorjectsConfig>) {
    //#region @backendFunc
    if (!Helpers.exists(this.linkedProjectsConfigPath)) {
      return;
    }
    const orgContent = Helpers.readFile(this.linkedProjectsConfigPath);
    linkedPorjectsConfig = LinkedPorjectsConfig.from(linkedPorjectsConfig);
    const writer = json5Write.load(orgContent);
    writer.write(linkedPorjectsConfig);

    const newContent = writer.toSource({
      quote: 'double',
      trailingComma: true,
      quotaKey: true,
    });
    Helpers.writeFile(this.linkedProjectsConfigPath, newContent);

    try {
      tsfmt.processFiles([this.linkedProjectsConfigPath], {
        verbose: false,
        replace: true,
        verify: false,
        // tsconfig: true,
        // tslint: true,
        editorconfig: true,
        tsfmt: true,
      } as any);
    } catch (error) {
      // console.log('ts formatting error',error)
    }
    //#endregion
  }
  //#endregion

  //#region methods & getters  / get linked projects config path
  private get linkedProjectsConfigPath() {
    return this.project.pathFor(config.file.linked_projects_json);
  }
  //#endregion

  //#region methods & getters  / recreate linked projects config
  protected recreateLinkedProjectsConfig() {
    //#region @backendFunc
    if (
      !Helpers.exists(this.linkedProjectsConfigPath) &&
      Helpers.exists(this.project.pathFor(config.file.firedev_jsonc))
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
    const currentRemoteUrl = this.project.git.originURL;
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
        if (!projOrProjName.remoteUrl()) {
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
      true, // TOOD fix recrusive
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
  async cloneUnexistedLinkedProjects(
    actionType: 'pull' | 'push',
    cloneChildren = false,
  ) {
    //#region @backendFunc
    if (
      actionType === 'push' &&
      this.project.git.automaticallyAddAllChnagesWhenPushingToGit()
    ) {
      return;
    }

    // Helpers.taskStarted(`Checking linked projects in ${this.genericName}`);
    const detectedLinkedProjects = this.detectedLinkedProjects;

    // console.log({ detectedLinkedProjects })
    // for (const detectedLinkedProject of detectedLinkedProjects) {
    //   if (this.linkedProjects.find(f => f.relativeClonePath === detectedLinkedProject.relativeClonePath)) {
    //     continue;
    //   }
    //   if (await Helpers.questionYesNo(`Do you want to remove unexisted linked project  ${detectedLinkedProject.relativeClonePath} ?`)) {
    //     Helpers.taskStarted(`Removing unexisted project ${detectedLinkedProject.relativeClonePath}`);
    //     Helpers.removeFolderIfExists(this.pathFor(detectedLinkedProject.relativeClonePath));
    //     Helpers.taskDone(`Removed unexisted project ${detectedLinkedProject.relativeClonePath}`);
    //   }
    // }
    // Helpers.taskDone(`Checking linked projects done in ${this.genericName}`);

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

${projectsThatShouldBeLinked
  .map(
    (p, index) =>
      `- ${index + 1}. ${chalk.bold(p.relativeClonePath)} ${p.remoteUrl()} {${p.purpose ? ` purpose: ${p.purpose} }` : ''}`,
  )
  .join('\n')}

      `);

      if (!this.project.isMonorepo) {
        if (
          cloneChildren ||
          (await Helpers.questionYesNo(
            `Do you want to clone above (missing) linked projects ?`,
          ))
        ) {
          for (const linkedProj of projectsThatShouldBeLinked) {
            // console.log({linkedProj})
            Helpers.info(
              `Cloning unexisted project from url ${chalk.bold(linkedProj.remoteUrl())} to ${linkedProj.relativeClonePath}`,
            );
            await this.project.git.clone(
              linkedProj.remoteUrl(),
              linkedProj.relativeClonePath,
              linkedProj.deafultBranch,
            );
            const childProjLocaiton = this.project.pathFor([
              linkedProj.relativeClonePath,
              linkedProj.internalRealtiveProjectPath,
            ]);
            const childProj = this.project.ins.From(childProjLocaiton);
            if (childProj) {
              await childProj.saveLocationToDB();
            }
          }
        }
      }
    }
    //#endregion
  }
  //#endregion
}
