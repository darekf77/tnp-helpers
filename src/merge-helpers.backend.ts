//#region imports
import { _, fse, path } from 'tnp-core';
import * as glob from 'glob';
// local
type Project = any;

import { config } from 'tnp-config';
import { Helpers } from './index';
import chalk from 'chalk';
//#endregion

export namespace HelpersMerge {

  export function getPrefixedBasename(relativeFilePath: string) {
    const ext = path.extname(relativeFilePath);
    const basename = path.basename(relativeFilePath, ext)
      .replace(/\/$/g, ''); // replace last part of url /

    const resultPath = Helpers.path.PREFIX(`${basename}${ext}`);
    return resultPath;
  }

  export function getPrefixedPathInJoin(relativeFilePath: string, project: Project) {

    const dirPath = path.dirname(relativeFilePath);
    // console.log('dirPath', dirPath)
    // console.log('project', project && project.name)
    const resultPath = path.join(
      project.location,
      dirPath,
      getPrefixedBasename(relativeFilePath));

    return resultPath;
  }


  export function pathToBaselineNodeModulesRelative(project: Project) {
    const baselinePath = project.typeIs('workspace') ? project.baseline.name
      : path.join(project.baseline.parent.name, project.baseline.name)

    return baselinePath;
  }

  /**
   * Example:
   * /Users/dariusz/project/node_modules/baseline/(workspace|workspaceChild)
   *
   */
  export function pathToBaselineThroughtNodeModules(project: Project) {
    const baselinePath = pathToBaselineNodeModulesRelative(project);

    const resultPath = path.join(
      project.location,
      config.folder.node_modules,
      baselinePath
    );
    return resultPath;
  }


  export function allCustomFiles(project: Project) {

    const globPath = path.join(
      project.location,
      config.folder.custom);
    const files = glob.sync(`${globPath}/**/*.*`);
    // console.log('CUSTOM FIELS', files)

    return files;
  }

  export function allBaselineFiles(project: Project) {

    let files = [];

    project.baseline.customizableFilesAndFolders.forEach(customizableFileOrFolder => {
      let globPath = path.join(pathToBaselineThroughtNodeModules(project), customizableFileOrFolder)
      if (!fse.existsSync(globPath)) {
        Helpers.error(`Custombizable folder of file doesn't exist: ${globPath}

        Please add: ${path.basename(globPath)} to your baseline

        or maybe forget ${chalk.bold('tnp install')} or ${chalk.bold('tnp link')} ?

        `)
      }
      if (fse.statSync(globPath).isDirectory()) {
        const globFiles = glob.sync(`${globPath}/**/*.*`);
        files = files.concat(globFiles);
      } else {
        files.push(globPath)
      }

    })
    // console.log('allBaselineFiles', files)

    return files;
  }


  export function pathToBaselineAbsolute(project: Project) {
    const isInsideWokrspace = (project.parent && project.parent.typeIs('workspace'));

    const toReplace = path.join(
      isInsideWokrspace ? (
        path.join(project.parent.name, project.name))
        : project.name
      , config.folder.node_modules)

    // console.log('toReplace', toReplace)
    const resultPath = pathToBaselineThroughtNodeModules(project).replace(`${toReplace}/`, '')
    return resultPath;
  }

  /**
   * Example:
   * /Users/dariusz/project/custom/(src|components)/path-to-file-relative
   */
  export function pathToCustom(project: Project) {
    const resultPath = path.join(project.location, config.folder.custom);
    return resultPath;
  }

  export function relativePathesBaseline(project: Project) {
    let baselineFiles: string[] = allBaselineFiles(project);
    // console.log('baselineFiles', baselineFiles)
    const baselineReplacePath = pathToBaselineThroughtNodeModules(project);
    // console.log('baselineReplacePath', baselineReplacePath)

    baselineFiles = baselineFiles.map(f => f.replace(baselineReplacePath, ''))

    return baselineFiles;
  }

  export function relativePathesCustom(project: Project) {
    let customFiles: string[] = allCustomFiles(project);
    // console.log('customFiles', customFiles)
    const customReplacePath = path.join(project.location, config.folder.custom);
    // console.log('customReplacePath', customReplacePath)

    customFiles = customFiles.map(f => f.replace(customReplacePath, ''))

    return customFiles;
  }

}
