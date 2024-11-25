import {
  _,
  path,
  fse,
  os,
  rimraf,
  crossPlatformPath,
  json5,
} from 'tnp-core/src';
import * as underscore from 'underscore';
import * as glob from 'glob';
import { JSON10 } from 'json10/src';
import * as crypto from 'crypto';
declare const global: any;

import { Helpers } from '../../index';
import { config, extAllowedToReplace } from 'tnp-config/src';

export interface GetRecrusiveFilesFromOptions {
  // withNameOnly?: string; // TODO
}

export class HelpersFileFolders {
  /**
   * Calculate file or string checksum
   */
  checksum(absolutePathToFileOrContent: string, algorithm?: 'md5' | 'sha1') {
    const fileContent = path.isAbsolute(absolutePathToFileOrContent)
      ? Helpers.readFile(absolutePathToFileOrContent)
      : absolutePathToFileOrContent;
    return crypto
      .createHash(algorithm || 'md5')
      .update(fileContent, 'utf8')
      .digest('hex');
  }

  getValueFromJSON(
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any {
    if (!fse.existsSync(filepath)) {
      return defaultValue;
    }
    const json = Helpers.readJson(filepath);
    return _.get(json, lodashGetPath, defaultValue);
  }

  getValueFromJSONC(
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any {
    if (!fse.existsSync(filepath)) {
      return defaultValue;
    }
    const json = Helpers.readJson5(filepath);
    return _.get(json, lodashGetPath, defaultValue);
  }

  readValueFromJson(
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any {
    return Helpers.getValueFromJSON(filepath, lodashGetPath, defaultValue);
  }

  readValueFromJsonC(
    filepath: string,
    lodashGetPath: string,
    defaultValue = void 0,
  ): any {
    return Helpers.getValueFromJSONC(filepath, lodashGetPath, defaultValue);
  }

  setValueToJSON(filepath: string, lodashGetPath: string, value: any): void {
    if (!fse.existsSync(filepath)) {
      Helpers.warn(`Recreating unexised json file: ${filepath}`);
      Helpers.writeFile(filepath, '{}');
    }
    const json = Helpers.readJson(filepath);
    _.set(json, lodashGetPath, value);
    Helpers.writeJson(filepath, json);
  }

  setValueToJSONC(filepath: string, lodashGetPath: string, value: any): void {
    if (!fse.existsSync(filepath)) {
      Helpers.warn(`Recreating unexised json file: ${filepath}`);
      Helpers.writeFile(filepath, '{}');
    }
    const json = Helpers.readJsonC(filepath);
    _.set(json, lodashGetPath, value);
    Helpers.writeJsonC(filepath, json);
  }

  /**
   * file size in bytes
   */
  size(filePath: string): number {
    if (!Helpers.exists(filePath) || Helpers.isFolder(filePath)) {
      return null;
    }
    return fse.lstatSync(filePath).size;
  }

  pathFromLink(filePath: string): string {
    return fse.readlinkSync(filePath);
  }

  // renameFolder(from: string, to: string, cwd?: string) {
  //   // const command = `mv  ${from}  ${to}`;
  //   const command = `renamer --find  ${from}  --replace  ${to} *`;
  //   Helpers.run(command, { cwd }).sync()
  // }

  /**
   * @deprecated
   */
  renameFolder(from: string, to: string, cwd?: string): void {
    Helpers.renameFiles(from, to, cwd);
  }

  /**
   * @deprecated
   */
  renameFiles(from: string, to: string, cwd?: string): void {
    try {
      const directoryPath = cwd || '.';

      // Read all files in the directory
      const files = fse.readdirSync(directoryPath);

      files.forEach(file => {
        // Check if the file name includes the 'from' pattern
        if (file.includes(from)) {
          const newFileName = file.replace(from, to);
          const currentPath = path.join(directoryPath, file);
          const newPath = path.join(directoryPath, newFileName);

          // Rename the file
          fse.renameSync(currentPath, newPath);
          console.log(`Renamed file from ${currentPath} to ${newPath}`);
        }
      });
    } catch (error) {
      console.error(`Error renaming files from ${from} to ${to}:`, error);
    }
  }

  getTempFolder() {
    let tmp = '/tmp';
    if (process.platform === 'darwin') {
      tmp = '/private/tmp';
    }
    if (process.platform === 'win32') {
      tmp = crossPlatformPath(
        path.join(crossPlatformPath(os.homedir()), '/AppData/Local/Temp'),
      );
    }
    if (!Helpers.exists(tmp)) {
      Helpers.mkdirp(tmp);
    }
    return tmp;
  }

  // createMultiplatformLink(target: string, link: string) {

  //   if (this.isPlainFileOrFolder(link)) {
  //     link = path.join(process.cwd(), link);
  //   }

  //   let command: string;
  //   if (os.platform() === 'win32') {

  //     if (target.startsWith('./')) {
  //       target = path.win32.normalize(path.join(process.cwd(), path.basename(target)))
  //     } else {
  //       if (target === '.' || target === './') {
  //         target = path.win32.normalize(path.join(process.cwd(), path.basename(link)))
  //       } else {
  //         target = path.win32.normalize(path.join(target, path.basename(link)))
  //       }
  //     }
  //     if (fse.existsSync(target)) {
  //       fse.unlinkSync(target);
  //     }
  //     target = path.win32.normalize(target)
  //     if (link === '.' || link === './') {
  //       link = process.cwd()
  //     }
  //     link = path.win32.normalize(link);
  //     // if (path.resolve(target) === path.resolve(link)) { // TODO
  //     //   Helpers.warn(`[createMultiplatformLink][win32] Trying to link same location`);
  //     //   return;
  //     // }
  //     command = "mklink \/D "
  //       + target
  //       + " "
  //       + link
  //       + " >nul 2>&1 "
  //   } else {
  //     if (target.startsWith('./')) {
  //       target = target.replace(/^\.\//g, '');
  //     }
  //     if (link === '.' || link === './') {
  //       link = process.cwd()
  //     }
  //     if (path.resolve(target) === path.resolve(link)) {
  //       Helpers.warn(`[createMultiplatformLink] Trying to link same location`);
  //       return;
  //     }
  //     command = `ln -sf "${link}" "${target}"`;
  //   }
  //   child_process.execSync(command);
  // }

  isPlainFileOrFolder(filePath: string): boolean {
    return /^([a-zA-Z]|\-|\_|\@|\#|\$|\!|\^|\&|\*|\(|\))+$/.test(filePath);
  }

  /**
   * @deprecated
   * use import (or modules only on backend)
   */
  requireUncached(module: string): any {
    delete require.cache[require.resolve(module)];
    return require(module);
  }

  /**
   * @deprecated
   * use import (or modules only on backend)
   *
   * get default export object from  js file
   * @param jsFilePath
   */
  require(jsFilePath: string) {
    const orgPath = jsFilePath;
    if (!fse.existsSync(jsFilePath)) {
      jsFilePath = `${jsFilePath}.js`;
    }
    if (!fse.existsSync(jsFilePath)) {
      Helpers.error(`Not able to find path: ${orgPath}`);
    }
    let fileContent = fse.readFileSync(jsFilePath).toLocaleString();

    (() => {
      const stringForRegex = `require\\(("|')\\.\\/([a-zA-Z0-9]|\\/|\\-|\\_|\\+|\\.)*("|')\\)`;
      Helpers.log(
        `[taon-helpre][require][${jsFilePath}] stringForRegex: ${stringForRegex}`,
        1,
      );

      fileContent = fileContent
        .split('\n')
        .map(line => {
          const matches = line.match(new RegExp(stringForRegex));
          if (matches !== null) {
            // console.log('matched', matches)
            const rep = _.first(matches);
            if (rep) {
              const newFilename = crossPlatformPath([
                path.dirname(jsFilePath),
                rep.split('(')[1].replace(/("|'|\))/g, ''),
              ]);
              line = line.replace(rep, `require('${newFilename}')`);
            }
            // console.log(line)
          }

          // console.log('matched', matches)

          return line;
        })
        .join('\n');
    })();

    (() => {
      const stringForRegex = `require\\(("|')([a-zA-Z0-9]|\\/|\\-|\\_|\\+|\\.)*("|')\\)`;
      Helpers.log(
        `[taon-helpre][require][${jsFilePath}] stringForRegex: ${stringForRegex}`,
        1,
      );

      fileContent = fileContent
        .split('\n')
        .map(line => {
          // console.log(`LINE: "${line}"`)
          const matches = line.match(new RegExp(stringForRegex));
          if (matches !== null) {
            // console.log('matched', matches)
            const rep = _.first(matches);
            if (rep) {
              const relativePart = rep.split('(')[1].replace(/("|'|\))/g, '');
              // console.log(`RELATIVE PART: "${relativePart}"`)
              if (
                relativePart.search('/') !== -1 &&
                !relativePart.startsWith('/')
              ) {
                const newFilename = crossPlatformPath([
                  path.dirname(jsFilePath),
                  'node_modules',
                  relativePart,
                ]);
                line = line.replace(rep, `require('${newFilename}')`);
              }
            }
            // console.log(line)
          }

          // console.log('matched', matches)

          return line;
        })
        .join('\n');
    })();

    return eval(fileContent);
  }

  tryRecreateDir(dirpath: string): void {
    try {
      Helpers.mkdirp(dirpath);
    } catch (error) {
      Helpers.log(`Trying to recreate directory: ${dirpath}`);
      Helpers.sleep(1);
      Helpers.mkdirp(dirpath);
    }
  }

  /**
   * @deprecated
   */
  tryCopyFrom(source: string, destination: string, options = {}): void {
    Helpers.log(`Trying to copy from: ${source} to ${destination}`);
    destination = crossPlatformPath(destination);
    source = crossPlatformPath(source);

    if (source === destination) {
      Helpers.warn(
        '[taon-helpers] Probably error... trying to copy the same folder...',
      );
      return;
    }

    if (fse.existsSync(source) && !fse.lstatSync(source).isDirectory()) {
      // Helpers.warn(`[tryCopyFrom] This source is not directory: ${source} to ${destination}`);
      Helpers.copyFile(source, destination);
      return;
    }
    if (fse.existsSync(destination.replace(/\/$/, ''))) {
      const destMaybe = destination.replace(/\/$/, '');
      const stats = fse.lstatSync(destMaybe);
      const isNotDirectory = !stats.isDirectory();
      const isSymbolicLink = stats.isSymbolicLink();
      if (isNotDirectory || isSymbolicLink) {
        rimraf.sync(destMaybe);
      }
    }
    options = _.merge(
      {
        overwrite: true,
        recursive: true,
      },
      options,
    );
    if (process.platform === 'win32') {
      // TODO QUICK_FIX
      options['dereference'] = true;
    }

    try {
      fse.copySync(source, destination, options);
    } catch (error) {
      rimraf.sync(destination);
      fse.copySync(source, destination, options);
    }
  }

  // private deleteFolderRecursive = (pathToFolder) => {
  //   if (fs.existsSync(pathToFolder)) {
  //     fs.readdirSync(pathToFolder).forEach((file, index) => {
  //       const curPath = path.join(pathToFolder, file);
  //       if (fs.lstatSync(curPath).isDirectory()) { // recurse
  //         this.deleteFolderRecursive(curPath);
  //       } else { // delete file
  //         fs.unlinkSync(curPath);
  //       }
  //     });
  //     fs.rmdirSync(pathToFolder);
  //   }
  // };

  move(from: string, to: string): void {
    if (!fse.existsSync(from)) {
      Helpers.warn(`[move] File or folder doesnt not exists: ${from}`);
      return;
    }
    if (!path.isAbsolute(from)) {
      Helpers.warn(`[move] Source path is not absolute: ${from}`);
      return;
    }
    if (!path.isAbsolute(to)) {
      Helpers.warn(`[move] Destination path is not absolute: ${to}`);
      return;
    }

    if (Helpers.isUnexistedLink(to)) {
      Helpers.remove(to);
    }

    if (Helpers.isUnexistedLink(path.dirname(to))) {
      Helpers.remove(path.dirname(to));
    }

    // if (!Helpers.exists(path.dirname(to))) {
    //   if (Helpers.isUnexistedLink(path.dirname(to))) {
    //     Helpers.remove(path.dirname(to));
    //   } else  {
    //     Helpers.remove(path.dirname(to));
    //     Helpers.mkdirp(path.dirname(to));
    //   }
    // }

    // if(Helpers.isSymlinkFileExitedOrUnexisted(to)) {
    //   Helpers.error(`You are trying to move into symlink location:
    //   from: ${from}
    //   to: ${to}
    //   `)
    // }

    while (true) {
      try {
        fse.moveSync(from, to, {
          overwrite: true,
        });
        break;
      } catch (error) {
        if (global['tnpNonInteractive']) {
          console.log(error);
          Helpers.error(`[${config.frameworkName}-helpers] Not able to move files

from: ${from}
to: ${to}

          `);
        }
        Helpers.info(`
 Moving things:

from: ${from}
to: ${to}

        `);
        Helpers.pressKeyAndContinue('Press any to try again this action');
      }
    }
  }

  findChildren<T>(
    location: string,
    createFn: (childLocation: string) => T,
    options?: { allowAllNames: boolean },
  ): T[] {
    const { allowAllNames } = options || {};
    let folders = Helpers.values(config.folder);
    folders = folders.filter(
      f =>
        ![
          config.folder.shared,
          // TODO add something more here ?
        ].includes(f),
    );

    const notAllowed: RegExp[] = [
      '.vscode',
      'node_modules',
      ...(allowAllNames
        ? []
        : [
            ...folders,
            'e2e',
            'tmp.*',
            'dist.*',
            'tests',
            'module',
            'browser',
            'bundle*',
            'components',
            '.git',
            'bin',
            'custom',
          ]),
    ]
      .filter(f => {
        return ![config.folder.external].includes(f) && _.isString(f);
      })
      .map(s => new RegExp(`^${Helpers.escapeStringForRegEx(s)}$`));

    const isDirectory = (source: string): boolean =>
      fse.lstatSync(source).isDirectory();
    const getDirectories = (source: string): string[] =>
      fse
        .readdirSync(source)
        .map(name => path.join(source, name))
        .filter(isDirectory);

    let subdirectories = getDirectories(location).filter(f => {
      const folderNam = path.basename(f);
      const allowed = notAllowed.filter(p => p.test(folderNam)).length === 0;
      return allowed;
    });
    // console.log(subdirectories)

    return subdirectories
      .map(dir => {
        // console.log('child:', dir)
        return createFn(dir);
      })
      .filter(c => !!c);
  }

  /**
   * @deprecated
   */
  findChildrenNavi<T>(
    location: string,
    createFn: (childLocation: string) => T,
  ): T[] {
    if (!fse.existsSync(location)) {
      return [];
    }

    const notAllowed: RegExp[] = [
      '.vscode',
      'node_modules',
      ...Helpers.values(config.folder),
      'e2e',
      'tmp.*',
      'dist.*',
      'tests',
      'module',
      'browser',
      'bundle*',
      'components',
      '.git',
      '.build',
      'bin',
      'custom',
    ].map(s => new RegExp(s));

    const isDirectory = source => fse.lstatSync(source).isDirectory();
    const getDirectories = source =>
      fse
        .readdirSync(source)
        .map(name => path.join(source, name))
        .filter(isDirectory);

    let subdirectories = getDirectories(location).filter(f => {
      const folderName = path.basename(f);
      if (/.*es\-.*/.test(folderName)) {
        return true;
      }
      return notAllowed.filter(p => p.test(folderName)).length === 0;
    });

    return subdirectories
      .map(dir => {
        return createFn(dir);
      })
      .filter(c => !!c);
  }

  /**
   * get all files from folder
   * absolute paths
   */
  getRecrusiveFilesFrom(
    dir: string,
    ommitFolders: string[] = [],
    options?: GetRecrusiveFilesFromOptions,
  ): string[] {
    options = options ? options : {};
    // const withNameOnly = options.withNameOnly;
    let files = [];
    const readedFilesAndFolders = fse.existsSync(dir)
      ? fse.readdirSync(dir)
      : [];
    const readed = readedFilesAndFolders
      .map(relativePathToFile => {
        const fullPath = crossPlatformPath([dir, relativePathToFile]);
        // console.log(`is direcotry ${fse.lstatSync(fullPath).isDirectory()} `, fullPath)
        if (fse.lstatSync(fullPath).isDirectory()) {
          if (
            ommitFolders.includes(path.basename(fullPath)) ||
            ommitFolders.includes(path.basename(path.dirname(fullPath)))
          ) {
            // Helpers.log(`Omitting: ${fullPath}`)
          } else {
            Helpers.getRecrusiveFilesFrom(
              fullPath,
              ommitFolders,
              options,
            ).forEach(aa => files.push(aa));
          }
          return;
        }
        return fullPath;
      })
      .filter(f => !!f);
    if (Array.isArray(readed)) {
      readed.forEach(r => files.push(r));
    }
    return files;
  }

  checkIfNameAllowedForTaonProj(folderName: string): boolean {
    const notAllowed: RegExp[] = [
      '^.vscode$',
      '^node_modules$',
      ...Helpers.values(config.tempFolders).map(v => `^${v}$`),
      '^e2e$',
      '^tmp.*',
      '^dist.*',
      '^tests$',
      '^module$',
      '^browser',
      'bundle*',
      '^components$',
      '.git',
      '^bin$',
      '^custom$',
      '^linked-repos$',
    ].map(s => new RegExp(s));

    return notAllowed.filter(p => p.test(folderName)).length === 0;
  }

  getLinesFromFiles(filename: string, lineCount?: number): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      let stream = fse.createReadStream(filename, {
        flags: 'r',
        encoding: 'utf-8',
        fd: null,
        mode: 438, // 0666 in Octal
        // bufferSize: 64 * 1024 as any
      });

      let data = '';
      let lines = [];
      stream.on('data', function (moreData) {
        data += moreData;
        lines = data.split('\n');
        // probably that last line is "corrupt" - halfway read - why > not >=
        if (lines.length > lineCount + 1) {
          stream.destroy();
          lines = lines.slice(0, lineCount); // junk as above
          resolve(lines);
        }
      });

      stream.on('error', function () {
        reject(`Error reading ${filename}`);
      });

      stream.on('end', function () {
        resolve(lines);
      });
    });
  }

  /**
   * Get the most recent changes file in direcory
   * @param dir absoulute path to file
   */
  getMostRecentFileName(dir: string): string {
    let files = Helpers.getRecrusiveFilesFrom(dir);

    // use underscore for max()
    return underscore.max(files, f => {
      // TODO refactor to lodash
      // console.log(f);
      // ctime = creation time is used
      // replace with mtime for modification time
      // console.log( `${fse.statSync(f).mtimeMs} for ${f}`   )
      return fse.statSync(f).mtimeMs;
    });
  }

  getMostRecentFilesNames(dir: string): string[] {
    const allFiles = Helpers.getRecrusiveFilesFrom(dir);
    const mrf = Helpers.getMostRecentFileName(dir);
    const mfrMtime = fse.lstatSync(mrf).mtimeMs;

    return allFiles.filter(f => {
      const info = fse.lstatSync(f);
      return info.mtimeMs === mfrMtime && !info.isDirectory();
    });
  }

  removeExcept(fromPath: string, exceptFolderAndFiles: string[]): void {
    fse
      .readdirSync(fromPath)
      .filter(f => {
        return !exceptFolderAndFiles.includes(f);
      })
      .map(f => path.join(fromPath, f))
      .forEach(af => Helpers.removeFolderIfExists(af));

    glob
      .sync(`${fromPath}/*.*`)
      .filter(f => {
        return !exceptFolderAndFiles.includes(path.basename(f));
      })
      .forEach(af => Helpers.removeFileIfExists(af));
  }

  copy(
    sourceDir: string,
    destinationDir: string,
    options?: {
      filter?: any;
      overwrite?: boolean;
      recursive?: boolean;
      asSeparatedFiles?: boolean;
      asSeparatedFilesAllowNotCopied?: boolean;
      asSeparatedFilesSymlinkAsFile?: boolean;
      /**
       * folders to omit: example: ['src','node_modules']
       *
       * This option works only with omitFoldersBaseFolder
       */
      omitFolders?: string[];
      /**
       * absolute path for base folder for omitFolder option
       */
      omitFoldersBaseFolder?: string;
      copySymlinksAsFiles?: boolean;
      copySymlinksAsFilesDeleteUnexistedLinksFromSourceFirst?: boolean;
      useTempFolder?: boolean;
      dontAskOnError?: boolean;
    } & fse.CopyOptionsSync,
  ): void {
    Helpers.log(
      `Copying from:

    ${sourceDir}
    to
    ${destinationDir}

    `,
      1,
    );
    Helpers.log(options, 1);

    // sourceDir = sourceDir ? (sourceDir.replace(/\/$/, '')) : sourceDir;
    // destinationDir = destinationDir ? (destinationDir.replace(/\/$/, '')) : destinationDir;
    if (!fse.existsSync(sourceDir)) {
      Helpers.warn(
        `[taon-helper][copy] Source dir doesnt exist: ${sourceDir} for destination: ${destinationDir}`,
      );
      return;
    }
    if (!fse.existsSync(path.dirname(destinationDir))) {
      if (Helpers.isUnexistedLink(path.dirname(destinationDir))) {
        Helpers.removeFileIfExists(path.dirname(destinationDir));
      }
      Helpers.mkdirp(path.dirname(destinationDir));
    }
    if (!options) {
      options = {} as any;
    }
    if (_.isUndefined(options.overwrite)) {
      options.overwrite = true;
    }
    if (_.isUndefined(options.recursive)) {
      options.recursive = true;
    }

    if (_.isUndefined(options.useTempFolder)) {
      options.useTempFolder = false;
    }

    if (options.copySymlinksAsFiles) {
      options['dereference'] = true;
    }

    if (!options.omitFolders) {
      options.omitFolders = [];
    }

    if (options.asSeparatedFilesSymlinkAsFile) {
      options.asSeparatedFilesSymlinkAsFile = true;
    }

    // const [srcStat, destStat] = [
    //   fse.existsSync(sourceDir) && fse.statSync(sourceDir),
    //   fse.existsSync(destinationDir) && fse.statSync(destinationDir),
    // ];
    // if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
    //   Helpers.warn(`[taon-helper][copy] Same location stats.. Trying to copy same source and destination:
    //   from: ${sourceDir}
    //   to: ${destinationDir}
    //   `);
    //   return;
    // }
    if (
      _.isArray(options.omitFolders) &&
      options.omitFolders.length >= 1 &&
      _.isNil(options.filter) &&
      _.isString(options.omitFoldersBaseFolder) &&
      path.isAbsolute(options.omitFoldersBaseFolder)
    ) {
      options.filter = Helpers.filterDontCopy(
        options.omitFolders,
        options.omitFoldersBaseFolder,
      );
    }

    if (options.copySymlinksAsFilesDeleteUnexistedLinksFromSourceFirst) {
      const files = Helpers.filesFrom(sourceDir, true, true);
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        if (Helpers.isUnexistedLink(file)) {
          Helpers.remove(file, true);
        }
      }
    }

    if (
      crossPlatformPath(sourceDir) === crossPlatformPath(destinationDir) ||
      crossPlatformPath(path.resolve(sourceDir)) ===
        crossPlatformPath(path.resolve(destinationDir))
    ) {
      Helpers.warn(`[taon-helper][copy] Trying to copy same source and destination
      from: ${sourceDir}
      to: ${destinationDir}
      `);
    } else {
      // Helpers.warn('filter', _.isFunction(options.filter));
      // Helpers.warn('sourceDir', sourceDir);
      // Helpers.warn('destinationDir', destinationDir);
      // Helpers.log(JSON.stringify(options))
      // try {

      if (options.useTempFolder) {
        let tempDestination = `${os.platform() === 'darwin' ? '/private/tmp' : '/tmp'}/${_.camelCase(destinationDir)}`;
        Helpers.removeFolderIfExists(tempDestination);
        fse.copySync(sourceDir, tempDestination, options);
        fse.copySync(tempDestination, destinationDir, options);
      } else {
        if (
          crossPlatformPath(sourceDir) ===
            crossPlatformPath(path.resolve(sourceDir)) &&
          Helpers.isExistedSymlink(sourceDir) &&
          !Helpers.exists(fse.readlinkSync(sourceDir))
        ) {
          Helpers.warn(`[taon-helpers] Not copying empty link from: ${sourceDir}
          `);
        } else {
          const copyFn = (): void => {
            try {
              if (options.asSeparatedFiles) {
                const copyRecFn = (cwdForFiles: string): void => {
                  const files = Helpers.getRecrusiveFilesFrom(
                    cwdForFiles,
                    options.omitFolders,
                  );
                  for (let index = 0; index < files.length; index++) {
                    const from = files[index];
                    const to = from.replace(sourceDir, destinationDir);

                    if (Helpers.isFolder(from)) {
                      if (
                        options.omitFolders.includes(
                          path.basename(path.dirname(from)),
                        ) ||
                        options.omitFolders.includes(path.basename(from))
                      ) {
                        continue;
                      } else {
                        copyRecFn(from);
                      }
                    } else {
                      const copyFileFn = () => {
                        if (
                          !options.asSeparatedFilesSymlinkAsFile &&
                          Helpers.isExistedSymlink(from)
                        ) {
                          Helpers.createSymLink(from, to);
                        } else {
                          Helpers.copyFile(from, to);
                        }
                      };
                      if (options.asSeparatedFilesAllowNotCopied) {
                        try {
                          copyFileFn();
                        } catch (e) {}
                      } else {
                        copyFileFn();
                      }
                    }
                  }
                };
                copyRecFn(sourceDir);
              } else {
                fse.copySync(sourceDir, destinationDir, options);
              }
            } catch (error) {
              const exitOnError = global['tnpNonInteractive'];
              Helpers.log(error);
              if (!options!.dontAskOnError) {
                Helpers.error(
                  `[taon-helper] Not able to copy folder:
                from: ${crossPlatformPath(sourceDir)}
                to: ${crossPlatformPath(destinationDir)}
                options: ${json5.stringify(options)}
                error: ${error?.message}
                `,
                  !exitOnError,
                );

                Helpers.pressKeyAndContinue(
                  `Press any key to repeat copy action...`,
                );
              }
              copyFn();
            }
          };
          if (process.platform === 'win32') {
            while (true) {
              try {
                copyFn();
                break;
              } catch (error) {
                Helpers.warn(`WARNING not able to copy .. trying again`);
                Helpers.sleep(1);
                continue;
              }
            }
          } else {
            copyFn();
          }
        }
      }

      // } catch (error) {
      //   console.trace(error);
      //   process.exit(0)
      // }
    }
  }

  filterDontCopy(basePathFoldersTosSkip: string[], projectOrBasepath: string) {
    return (src: string, dest: string): boolean => {
      // console.log('src', src)
      src = crossPlatformPath(src);
      const baseFolder = _.first(
        crossPlatformPath(src)
          .replace(crossPlatformPath(projectOrBasepath), '')
          .replace(/^\//, '')
          .split('/'),
      );

      // console.log('baseFolder', baseFolder)
      if (!baseFolder || baseFolder.trim() === '') {
        return true;
      }
      const isAllowed = _.isUndefined(
        basePathFoldersTosSkip.find(f =>
          baseFolder.startsWith(crossPlatformPath(f)),
        ),
      );

      // console.log('isAllowed', isAllowed)
      return isAllowed;
    };
  }

  filterOnlyCopy(
    basePathFoldersOnlyToInclude: string[],
    projectOrBasepath: string,
  ) {
    return (src: string, dest: string): boolean => {
      src = crossPlatformPath(src);
      const baseFolder = _.first(
        crossPlatformPath(src)
          .replace(crossPlatformPath(projectOrBasepath), '')
          .replace(/^\//, '')
          .split('/'),
      );

      if (!baseFolder || baseFolder.trim() === '') {
        return true;
      }
      const isAllowed = !_.isUndefined(
        basePathFoldersOnlyToInclude.find(f =>
          baseFolder.startsWith(crossPlatformPath(f)),
        ),
      );

      return isAllowed;
    };
  }

  copyFile(
    sourcePath: string,
    destinationPath: string,
    options?: {
      transformTextFn?: (input: string) => string;
      debugMode?: boolean;
      fast?: boolean;
      dontCopySameContent?: boolean;
    },
  ): boolean {
    if (_.isUndefined(options)) {
      options = {} as any;
    }
    if (_.isUndefined(options.debugMode)) {
      options.debugMode = false;
    }
    if (_.isUndefined(options.debugMode)) {
      options.fast = true;
    }
    if (_.isUndefined(options.dontCopySameContent)) {
      options.dontCopySameContent = true;
    }
    const { debugMode, fast, transformTextFn, dontCopySameContent } = options;
    if (_.isFunction(transformTextFn) && fast) {
      Helpers.error(
        `[taon-helpers][copyFile] You cannot use  transformTextFn in fast mode`,
      );
    }

    if (!fse.existsSync(sourcePath)) {
      Helpers.logWarn(
        `[taon-helpers][copyFile] No able to find source of ${sourcePath}`,
      );
      return false;
    }
    if (fse.lstatSync(sourcePath).isDirectory()) {
      Helpers.warn(
        `[taon-helpers][copyFile] Trying to copy directory as file: ${sourcePath}`,
        false,
      );
      return false;
    }

    if (sourcePath === destinationPath) {
      Helpers.warn(
        `[taon-helpers][copyFile] Trying to copy same file ${sourcePath}`,
      );
      return false;
    }
    let destDirPath = path.dirname(destinationPath);

    if (Helpers.isFolder(destinationPath)) {
      Helpers.removeFolderIfExists(destinationPath);
    }

    if (
      !Helpers.isSymlinkFileExitedOrUnexisted(destDirPath) &&
      !fse.existsSync(destDirPath)
    ) {
      Helpers.mkdirp(destDirPath);
    }

    //#region it is good code
    if (Helpers.isExistedSymlink(destDirPath)) {
      destDirPath = fse.realpathSync(destDirPath);
      const newDestinationPath = crossPlatformPath(
        path.join(destDirPath, path.basename(destinationPath)),
      );
      if (Helpers.isFolder(newDestinationPath)) {
        Helpers.removeFolderIfExists(newDestinationPath);
      }

      destinationPath = newDestinationPath;
    }
    //#endregion

    if (dontCopySameContent && fse.existsSync(destinationPath)) {
      const destinationContent = Helpers.readFile(destinationPath);
      const sourceContent = Helpers.readFile(sourcePath).toString();
      if (destinationContent === sourceContent) {
        // @REMEMBER uncomment if any problem
        // Helpers.log(`Destination has the same content as source: ${path.basename(sourcePath)}`);
        return false;
      }
    }

    debugMode &&
      Helpers.log(`path.extname(sourcePath) ${path.extname(sourcePath)}`);

    if (fast || !extAllowedToReplace.includes(path.extname(sourcePath))) {
      fse.copyFileSync(sourcePath, destinationPath);
    } else {
      let sourceData = Helpers.readFile(sourcePath).toString();
      if (_.isFunction(transformTextFn)) {
        sourceData = transformTextFn(sourceData);
      }

      debugMode &&
        Helpers.log(`
      [taon-helpers][copyFile] Write to: ${destinationPath} file:
============================================================================================
${sourceData}
============================================================================================
        `);

      Helpers.writeFile(destinationPath, sourceData);
    }

    return true;
  }

  /**
   * get real absolute path
   */
  resolve(fileOrFolderPath: string): string {
    if (fileOrFolderPath.startsWith('~')) {
      fileOrFolderPath = crossPlatformPath([
        os.homedir(),
        fileOrFolderPath.replace(`~/`, ''),
      ]);
    }
    return crossPlatformPath(path.resolve(fileOrFolderPath));
  }
}
