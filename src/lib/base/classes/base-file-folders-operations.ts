//#region imports
import { config, fileName, folderName } from 'tnp-config/src';
import { _, crossPlatformPath, fse, path } from 'tnp-core/src';

import { Helpers } from '../../index';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';
//#endregion

export class BaseFileFoldersOperations<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  //#region files and folders to copy when copying project
  /**
   * Relative to project root
   * @returns list of files and folders to copy when copying project
   */
  protected fielsAndFoldersToCopy(): string[] {
    return [
      folderName._bin,
      folderName.src,
      folderName.docs,
      fileName.package_json,
      fileName.README_MD,
    ];
  }
  //#endregion

  //#region move project to
  async moveProjectTo(destination: string): Promise<void> {
    await this.copyProjectTo(destination);
    this.deleteProject();
  }
  //#endregion

  //#region delete project
  deleteProject(options?: { skipChildren?: boolean }): void {
    //#region @backendFunc
    options = options || {};

    const removeProj = (proj: BaseProject) => {
      try {
        fse.unlinkSync(proj.pathFor(folderName.node_modules));
      } catch (error) {}
      Helpers.removeSymlinks(proj.location);
      Helpers.removeSymlinks(proj.pathFor(folderName.node_modules));
      if (!options.skipChildren) {
        for (const child of this.project.children) {
          removeProj(child);
        }
      }
    };

    removeProj(this.project);

    Helpers.remove(this.project.location);
    // this.ins.remove(this.project);
    //#endregion
  }
  //#endregion

  //#region copy project to
  async copyProjectTo(
    destination: string,
    options?: { skipChildren?: boolean },
  ): Promise<void> {
    //#region @backendFunc
    options = options || {};
    const fielsAndFoldersToCopy = this.fielsAndFoldersToCopy();

    const copyProj = async (proj: BaseProject, rootDest: string) => {
      for (const relativePath of fielsAndFoldersToCopy) {
        const sourcePath = proj.pathFor(relativePath);
        const destPath = crossPlatformPath([
          rootDest,
          proj.basename,
          relativePath,
        ]);

        if (Helpers.exists(sourcePath)) {
          if (Helpers.isFolder(sourcePath)) {
            console.log(`Copying folder ${sourcePath} to ${destPath}`);
            Helpers.copy(sourcePath, destPath);
          } else {
            console.log(`Copying file ${sourcePath} to ${destPath}`);
            Helpers.copyFile(sourcePath, destPath);
          }
        } else {
          console.warn(`Path ${sourcePath} does not exist. Skipping...`);
        }
      }
      // const copiedProject = this.project.ins.From([rootDest, proj.basename]);
      // if (!copiedProject) {
      //   throw new Error(
      //     `Project was not copied correctly. Cannot find it in ${crossPlatformPath([rootDest, proj.basename])}`,
      //   );
      // }
      // try {
      //   await copiedProject.init();
      // } catch (error) {}

      if (!options.skipChildren) {
        const children = proj.children.filter(
          f => f.location !== proj.location,
        ); // prevent self
        for (const child of children) {
          await copyProj(child, crossPlatformPath([rootDest, proj.basename]));
          // this.ins.add(
          //   this.ins.From([destination, path.basename(child.location)]),
          // );
        }
        // try {
        //   await copiedProject.refreshChildrenProjects();
        // } catch (error) {}
      }
    };

    await copyProj(this.project, destination);
    // this.ins.add(this.ins.From(destination));
    //#endregion
  }
  //#endregion
}
