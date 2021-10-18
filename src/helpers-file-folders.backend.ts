import {
  _,
  path,
  fse,
  os,
  rimraf,
  child_process,
  crossPlatformPath,
  json5,
} from 'tnp-core';
import * as  underscore from 'underscore';
import * as glob from 'glob';
import { JSON10 } from 'json10';
import * as crypto from 'crypto';


import { Helpers } from './index';
import { config } from 'tnp-config';
import { Models } from 'tnp-models';



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
      .digest('hex')
  }

  getValueFromJSON(filepath: string, lodashGetPath: string, defaultValue = void 0) {
    if (!fse.existsSync(filepath)) {
      return defaultValue;
    }
    const json = Helpers.readJson(filepath);
    return _.get(json, lodashGetPath, defaultValue);
  }

  readValueFromJson(filepath: string, lodashGetPath: string, defaultValue = void 0) {
    return Helpers.getValueFromJSON(filepath, lodashGetPath, defaultValue);
  }

  setValueToJSON(filepath: string, lodashGetPath: string, value: any) {
    if (!fse.existsSync(filepath)) {
      Helpers.error(`Not able to set value in json: ${filepath}`, true, true);
      return;
    }
    const json = Helpers.readJson(filepath);
    _.set(json, lodashGetPath, value);
    Helpers.writeFile(filepath, json);
  }


  /**
   * file size in bytes
   */
  size(filePath: string) {
    if (!Helpers.exists(filePath) || Helpers.isFolder(filePath)) {
      return null;
    }
    return fse.lstatSync(filePath).size;
  }


  pathFromLink(filePath: string) {
    return fse.readlinkSync(filePath);
  }



  renameFolder(from: string, to: string, cwd?: string) {
    // const command = `mv  ${from}  ${to}`;
    const command = `renamer --find  ${from}  --replace  ${to} *`;
    Helpers.run(command, { cwd }).sync()
  }

  getTempFolder() {
    let tmp = '/tmp';
    if (process.platform === 'darwin') {
      tmp = '/private/tmp';
    }
    if (process.platform === 'win32') {
      tmp = crossPlatformPath(path.join(crossPlatformPath(os.homedir()), '/AppData/Local/Temp'))
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


  isPlainFileOrFolder(filePath) {
    return /^([a-zA-Z]|\-|\_|\@|\#|\$|\!|\^|\&|\*|\(|\))+$/.test(filePath);
  }


  requireUncached(module) {
    delete require.cache[require.resolve(module)];
    return require(module);
  }


  /**
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
      Helpers.log(`stringForRegex: ${stringForRegex}`, 1);

      fileContent = fileContent.split('\n').map(line => {
        const matches = line.match(new RegExp(stringForRegex));
        if (matches !== null) {
          // console.log('matched', matches)
          const rep = _.first(matches);
          if (rep) {
            const newFilename = path.join(path.dirname(jsFilePath), rep.split('(')[1].replace(/("|'|\))/g, ''));
            line = line.replace(rep, `require('${newFilename}')`);
          }
          // console.log(line)
        }

        // console.log('matched', matches)


        return line;
      }).join('\n');
    })();

    (() => {
      const stringForRegex = `require\\(("|')([a-zA-Z0-9]|\\/|\\-|\\_|\\+|\\.)*("|')\\)`;
      Helpers.log(`stringForRegex: ${stringForRegex}`);

      fileContent = fileContent.split('\n').map(line => {
        // console.log(`LINE: "${line}"`)
        const matches = line.match(new RegExp(stringForRegex));
        if (matches !== null) {
          // console.log('matched', matches)
          const rep = _.first(matches);
          if (rep) {
            const relativePart = rep.split('(')[1].replace(/("|'|\))/g, '');
            // console.log(`RELATIVE PART: "${relativePart}"`)
            if (relativePart.search('/') !== -1 && !relativePart.startsWith('/')) {
              const newFilename = path.join(path.dirname(jsFilePath), 'node_modules', relativePart);
              line = line.replace(rep, `require('${newFilename}')`);
            }
          }
          // console.log(line)
        }

        // console.log('matched', matches)


        return line;
      }).join('\n');
    })();


    return eval(fileContent)
  }

  tryRecreateDir(dirpath: string) {
    try {
      Helpers.mkdirp(dirpath);
    } catch (error) {
      Helpers.log(`Trying to recreate directory: ${dirpath}`)
      Helpers.sleep(1);
      Helpers.mkdirp(dirpath);
    }
  }

  tryCopyFrom(source: string, destination: string, options = {}) {
    Helpers.log(`Trying to copy from: ${source} to ${destination}`);

    if (fse.existsSync(source) && !fse.lstatSync(source).isDirectory()) {
      // Helpers.warn(`[tryCopyFrom] This source is not directory: ${source} to ${destination}`);
      Helpers.copyFile(source, destination);
      return;
    }
    if (fse.existsSync(destination.replace(/\/$/, ''))) {
      const destMaybe = destination.replace(/\/$/, '');
      const stats = fse.lstatSync(destMaybe);
      const isNotDirectory = !stats.isDirectory();
      const isSymbolicLink = stats.isSymbolicLink()
      if (isNotDirectory || isSymbolicLink) {
        rimraf.sync(destMaybe);
      }
    }
    options = _.merge({
      overwrite: true,
      recursive: true,
    }, options);
    if (process.platform === 'win32') { // @LAST
      options['dereference'] = true;
    }

    try {
      fse.copySync(source, destination, options);
    } catch (error) {
      rimraf.sync(destination);
      fse.copySync(source, destination, options);
    }
  }

  removeIfExists(absoluteFileOrFolderPath: string) {
    if (process.platform === 'win32') {
      rimraf.sync(absoluteFileOrFolderPath);
      return;
    }
    try {
      fse.unlinkSync(absoluteFileOrFolderPath);
    } catch (error) { }
    if (fse.existsSync(absoluteFileOrFolderPath)) {
      if (fse.lstatSync(absoluteFileOrFolderPath).isDirectory()) {
        fse.removeSync(absoluteFileOrFolderPath);
      } else {
        fse.unlinkSync(absoluteFileOrFolderPath);
      }
    }
  }

  removeFileIfExists(absoluteFilePath: string, options?: { modifiedFiles?: Models.other.ModifiedFiles; }) {
    if (process.platform === 'win32') {
      rimraf.sync(absoluteFilePath);
      return;
    }
    // console.log(`removeFileIfExists: ${absoluteFilePath}`)
    const { modifiedFiles } = options || { modifiedFiles: { modifiedFiles: [] } };
    if (fse.existsSync(absoluteFilePath)) {
      fse.unlinkSync(absoluteFilePath);
      modifiedFiles.modifiedFiles.push(absoluteFilePath);
    }
  }

  removeFolderIfExists(absoluteFolderPath: string, options?: { modifiedFiles?: Models.other.ModifiedFiles; }) {
    Helpers.log(`[helpers] Remove folder: ${absoluteFolderPath}`)
    if (process.platform === 'win32') {
      rimraf.sync(absoluteFolderPath);
      return;
    }
    const { modifiedFiles } = options || { modifiedFiles: { modifiedFiles: [] } };
    if (fse.existsSync(absoluteFolderPath)) {
      fse.removeSync(absoluteFolderPath);
      modifiedFiles.modifiedFiles.push(absoluteFolderPath);
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

  tryRemoveDir(dirpath: string, contentOnly = false) {
    if (!fse.existsSync(dirpath)) {
      console.warn(`Folder ${path.basename(dirpath)} doesn't exist.`)
      return;
    }
    Helpers.log(`[tnp-helpers][tryRemoveDir]: ${dirpath}`);
    // if (dirpath == '/Users/dfilipiak/projects/npm/firedev-projects/container-v2/workspace-v2') {
    //   console.trace('aaaaaaaa')
    //   process.exit(0)
    // }
    try {
      if (contentOnly) {
        rimraf.sync(`${dirpath}/*`)
      } else {
        rimraf.sync(dirpath)
      }
      Helpers.log(`Remove done: ${dirpath}`)
      return;
    } catch (e) {
      Helpers.log(`Trying to remove directory: ${dirpath}`)
      Helpers.sleep(1);
      Helpers.tryRemoveDir(dirpath, contentOnly);
    }
  }

  move(from: string, to: string) {
    if (!fse.existsSync(from)) {
      Helpers.warn(`[move] File or folder doesnt not exists: ${from}`)
      return;
    }
    if (!path.isAbsolute(from)) {
      Helpers.warn(`[move] Source path is not absolute: ${from}`)
      return;
    }
    if (!path.isAbsolute(to)) {
      Helpers.warn(`[move] Destination path is not absolute: ${to}`)
      return;
    }
    fse.moveSync(from, to, {
      overwrite: true
    });
  }

  remove(fileOrFolderPathOrPatter: string, exactFolder = false) {
    Helpers.log(`[tnp-helpers][remove]: ${fileOrFolderPathOrPatter}`);
    if (exactFolder) {
      rimraf.sync(fileOrFolderPathOrPatter, { glob: false, disableGlob: true, });
      return;
    }
    rimraf.sync(fileOrFolderPathOrPatter);
  }



  findChildren<T>(location, createFn: (childLocation: string) => T): T[] {

    const notAllowed: RegExp[] = [
      '\.vscode', 'node\_modules',
      ...Helpers.values(config.folder),
      'e2e', 'tmp.*', 'dist.*', 'tests', 'module', 'browser', 'bundle*',
      'components', '\.git', 'bin', 'custom'
    ].filter(f => {
      return ![config.folder.external].includes(f) && _.isString(f);
    }).map(s => new RegExp(s))

    const isDirectory = source => fse.lstatSync(source).isDirectory()
    const getDirectories = source =>
      fse.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

    let subdirectories = getDirectories(location)
      .filter(f => {
        const folderNam = path.basename(f);
        const allowed= (notAllowed.filter(p => p.test(folderNam)).length === 0);
        return allowed;
      })

    return subdirectories
      .map(dir => {
        // console.log('child:', dir)
        return createFn(dir);
      })
      .filter(c => !!c)
  }

  findChildrenNavi<T>(location, createFn: (childLocation: string) => T): T[] {
    if (!fse.existsSync(location)) {
      return []
    }

    const notAllowed: RegExp[] = [
      '\.vscode', 'node\_modules',
      ...Helpers.values(config.folder),
      'e2e', 'tmp.*', 'dist.*', 'tests',
      'module', 'browser', 'bundle*',
      'components', '\.git', '\.build', 'bin', 'custom'
    ].map(s => new RegExp(s))

    const isDirectory = source => fse.lstatSync(source).isDirectory()
    const getDirectories = source =>
      fse.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

    let subdirectories = getDirectories(location)
      .filter(f => {
        const folderName = path.basename(f);
        if (/.*es\-.*/.test(folderName)) {
          return true
        }
        return (notAllowed.filter(p => p.test(folderName)).length === 0);
      })

    return subdirectories
      .map(dir => {
        return createFn(dir);
      })
      .filter(c => !!c);
  }


  getRecrusiveFilesFrom(dir: string, ommitFolders: string[] = []): string[] {
    let files = [];
    const readedFilesAndFolders = fse.readdirSync(dir);
    const readed = readedFilesAndFolders.map(f => {
      const fullPath = path.join(dir, f);
      // console.log(`is direcotry ${fse.lstatSync(fullPath).isDirectory()} `, fullPath)
      if (fse.lstatSync(fullPath).isDirectory()) {
        if (
          ommitFolders.includes(path.basename(fullPath)) ||
          ommitFolders.includes(path.basename(path.dirname(fullPath)))
        ) {
          // Helpers.log(`Omitting: ${fullPath}`)
        } else {
          Helpers.getRecrusiveFilesFrom(fullPath, ommitFolders).forEach(aa => files.push(aa))
        }
      }
      return fullPath;
    })
    if (Array.isArray(readed)) {
      readed.forEach(r => files.push(r))
    }
    return files;
  }

  getLinesFromFiles(filename: string, lineCount?: number) {
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
    })

  };


  /**
   * Get the most recent changes file in direcory
   * @param dir absoulute path to file
   */
  getMostRecentFileName(dir): string {
    let files = Helpers.getRecrusiveFilesFrom(dir);

    // use underscore for max()
    return underscore.max(files, (f) => { // TODO refactor to lodash
      // console.log(f);
      // ctime = creation time is used
      // replace with mtime for modification time
      // console.log( `${fse.statSync(f).mtimeMs} for ${f}`   )
      return fse.statSync(f).mtimeMs;

    });
  }

  getMostRecentFilesNames(dir): string[] {

    const allFiles = Helpers.getRecrusiveFilesFrom(dir);
    const mrf = Helpers.getMostRecentFileName(dir);
    const mfrMtime = fse.lstatSync(mrf).mtimeMs;

    return allFiles.filter(f => {
      const info = fse.lstatSync(f);
      return (info.mtimeMs === mfrMtime && !info.isDirectory())
    });
  }

  removeExcept(fromPath: string, exceptFolderAndFiles: string[]) {
    fse.readdirSync(fromPath)
      .filter(f => {
        return !exceptFolderAndFiles.includes(f)
      })
      .map(f => path.join(fromPath, f))
      .forEach(af => Helpers.removeFolderIfExists(af));

    (glob.sync(`${fromPath}/*.*`))
      .filter(f => {
        return !exceptFolderAndFiles.includes(path.basename(f))
      })
      .forEach(af => Helpers.removeFileIfExists(af));
  }

  copy(sourceDir: string, destinationDir: string, options?:
    {
      filter?: any;
      overwrite?: boolean;
      recursive?: boolean;
      asSeparatedFiles?: boolean,
      asSeparatedFilesAllowNotCopied?: boolean,
      omitFolders?: string[];
      omitFoldersBaseFolder?: string;
      copySymlinksAsFiles?: boolean;
      useTempFolder?: boolean;
    } & fse.CopyOptionsSync) {
    // sourceDir = sourceDir ? (sourceDir.replace(/\/$/, '')) : sourceDir;
    // destinationDir = destinationDir ? (destinationDir.replace(/\/$/, '')) : destinationDir;
    if (!fse.existsSync(sourceDir)) {
      Helpers.warn(`[helper][copy] Source dir doesnt exist: ${sourceDir} for destination: ${destinationDir}`);
      return;
    }
    if (!fse.existsSync(path.dirname(destinationDir))) {
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

    // const [srcStat, destStat] = [
    //   fse.existsSync(sourceDir) && fse.statSync(sourceDir),
    //   fse.existsSync(destinationDir) && fse.statSync(destinationDir),
    // ];
    // if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
    //   Helpers.warn(`[helper][copy] Same location stats.. Trying to copy same source and destination:
    //   from: ${sourceDir}
    //   to: ${destinationDir}
    //   `);
    //   return;
    // }
    if (_.isArray(options.omitFolders) && options.omitFolders.length >= 1
      && _.isNil(options.filter) && _.isString(options.omitFoldersBaseFolder)
      && path.isAbsolute(options.omitFoldersBaseFolder)) {
      options.filter = (src: string) => {
        // console.log('src',src)
        const baseFolder = _.first(src.replace(options.omitFoldersBaseFolder, '')
          .replace(/^\//, '').split('/'));
        if (!baseFolder || baseFolder.trim() === '') {
          return true;
        }
        const isAllowed = _.isUndefined(options.omitFolders.find(f => baseFolder.startsWith(f)));
        return isAllowed;
      };
    }

    if (sourceDir === destinationDir || path.resolve(sourceDir) === path.resolve(destinationDir)) {
      Helpers.warn(`[helper][copy] Trying to copy same source and destination
      from: ${sourceDir}
      to: ${destinationDir}
      `);
    } else {
      // console.warn('filter', _.isFunction(options.filter));
      // console.warn('sourceDir', sourceDir);
      // console.warn('destinationDir', destinationDir);
      // console.log(JSON.stringify(options))
      // try {

      if (options.useTempFolder) {
        let tempDestination = `${os.platform() === 'darwin' ? '/private/tmp' : '/tmp'}/${_.camelCase(destinationDir)}`;
        Helpers.removeFolderIfExists(tempDestination);
        fse.copySync(sourceDir, tempDestination, options);
        fse.copySync(tempDestination, destinationDir, options);
      } else {
        if ((sourceDir === path.resolve(sourceDir)) && Helpers.isLink(sourceDir) && !Helpers.exists(fse.readlinkSync(sourceDir))) {
          Helpers.warn(`[tnp-helpers] Not copying empty link from: ${sourceDir}
          `)
        } else {
          const copyFn = () => {
            try {

              if (options.asSeparatedFiles) {
                const copyRecFn = (cwdForFiles) => {
                  // if (path.basename(cwdForFiles) === 'plugins') {
                  //   debugger
                  // }
                  const files = Helpers.getRecrusiveFilesFrom(cwdForFiles, options.omitFolders);
                  for (let index = 0; index < files.length; index++) {
                    const from = files[index];
                    const to = from.replace(sourceDir, destinationDir);


                    if (Helpers.isFolder(from)) {
                      if (
                        options.omitFolders.includes(path.basename(path.dirname(from))) ||
                        options.omitFolders.includes(path.basename(from))
                      ) {
                        continue;
                      } else {
                        copyRecFn(from);
                      }
                    } else {
                      if (options.asSeparatedFilesAllowNotCopied) {
                        try {
                          Helpers.copyFile(from, to);
                        } catch (e) { }
                      } else {
                        Helpers.copyFile(from, to);
                      }
                    }
                  }
                }
                copyRecFn(sourceDir);
              } else {
                fse.copySync(sourceDir, destinationDir, options);
              }
            } catch (error) {
              const exitOnError = global['tnpNonInteractive'];
              Helpers.error(`[tnp-helper] Not able to copy folder:
              from: ${sourceDir}
              to: ${destinationDir}
              options: ${json5.stringify(options)}
              error: ${error?.message}
              `, !exitOnError, !exitOnError);

              Helpers.pressKeyAndContinue(`Press any key to repeat copy action...`);
              copyFn();
            }

          };
          copyFn();

        }
      }


      // } catch (error) {
      //   console.trace(error);
      //   process.exit(0)
      // }

    }
  }

  copyFile(sourcePath: string, destinationPath: string,
    options?: {
      transformTextFn?: (input: string) => string;
      debugMode?: boolean;
      fast?: boolean;
      dontCopySameContent?: boolean;
      modifiedFiles?: Models.other.ModifiedFiles;
    }): boolean {

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
    const { debugMode, fast, transformTextFn, dontCopySameContent, modifiedFiles } = options;
    if (_.isFunction(transformTextFn) && fast) {
      Helpers.error(`[copyFile] You cannot use  transformTextFn in fast mode`);
    }

    if (!fse.existsSync(sourcePath)) {
      Helpers.warn(`[copyFile] No able to find source of ${sourcePath}`, true);
      return false;
    }
    if (fse.lstatSync(sourcePath).isDirectory()) {
      Helpers.warn(`[copyFile] Trying to copy directory as file: ${sourcePath}`, false)
      return false;
    }

    if (sourcePath === destinationPath) {
      Helpers.warn(`[copyFile] Trying to copy same file ${sourcePath}`);
      return false;
    }
    const destDirPath = path.dirname(destinationPath);
    debugMode && Helpers.log(`[copyFile] destDirPath: ${destDirPath}`);
    if (!fse.existsSync(destDirPath)) {
      Helpers.mkdirp(destDirPath);
    }

    if (dontCopySameContent && fse.existsSync(destinationPath)) {
      const destinationContent = Helpers.readFile(destinationPath);
      const sourceContent = Helpers.readFile(sourcePath).toString();
      if (destinationContent === sourceContent) {
        // @REMEMBER uncomment if any problem
        // Helpers.log(`Destination has the same content as source: ${path.basename(sourcePath)}`);
        return false;
      }
    }

    debugMode && Helpers.log(`path.extname(sourcePath) ${path.extname(sourcePath)}`);

    if (fast || !config.extensions.modificableByReplaceFn.includes(path.extname(sourcePath))) {
      fse.copyFileSync(sourcePath, destinationPath);
    } else {
      let sourceData = Helpers.readFile(sourcePath).toString();
      if (_.isFunction(transformTextFn)) {
        sourceData = transformTextFn(sourceData);
      }

      debugMode && Helpers.log(`
[copyFile] Write to: ${destinationPath} file:
============================================================================================
${sourceData}
============================================================================================
        `);

      Helpers.writeFile(destinationPath, sourceData);
    }
    if (modifiedFiles && _.isArray(modifiedFiles.modifiedFiles)) {
      modifiedFiles.modifiedFiles.push(destinationPath);
    }
    return true;
  }

  /**
   * get real absolute path
   */
  resolve(fileOrFolderPath: string) {
    if (fileOrFolderPath.startsWith('~')) {
      fileOrFolderPath = path.join(os.homedir(), fileOrFolderPath.replace(`~/`, ''));
    }
    return path.resolve(fileOrFolderPath);
  }

}
