import * as fse from 'fs-extra';
import * as fs from 'fs';
import * as child from 'child_process';
import * as _ from 'lodash';
import * as  underscore from 'underscore';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as os from 'os';
import * as glob from 'glob';
import { JSON10 } from 'json10';
import * as crypto from 'crypto';
import * as json5 from 'json5';

import { Helpers } from './index';
import { config } from 'tnp-config';

import { Models } from 'tnp-models';

const encoding = 'utf8';

export class HelpersFileFolders {

  /**
   * Calculate file checksum
   */
  checksum(pathToFile: string, algorithm?: 'md5' | 'sha1') {
    const fileContent = Helpers.readFile(pathToFile);
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

  isFolder(pathToFileOrMaybeFolder: string) {
    return pathToFileOrMaybeFolder && fse.existsSync(pathToFileOrMaybeFolder) &&
      fse.lstatSync(pathToFileOrMaybeFolder).isDirectory();
  }

  /**
   * return absolute paths for folders inside folders
   */
  foldersFrom(pathToFolder: string | string[]) {
    if (_.isArray(pathToFolder)) {
      pathToFolder = path.join(...pathToFolder) as string;
    }
    if (!Helpers.exists(pathToFolder)) {
      return [];
    }
    return fse.readdirSync(pathToFolder)
      .map(f => path.join(pathToFolder as string, f))
      .filter(f => fse.lstatSync(f).isDirectory())
      ;
  }

  stringify(inputObject: any): string {
    // if (_.isString(inputObject)) {
    //   return inputObject;
    // }
    // if (_.isObject(inputObject)) {
    //   config.log(inputObject)
    //   Helpers.error(`[tnp-helpers] trying to stringify not a object`, false, true);
    // }
    return JSON.stringify(inputObject, null, 2);
  }

  parse<T = any>(jsonInstring: string, useJson5 = false) {
    if (!_.isString(jsonInstring)) {
      Helpers.log(jsonInstring)
      Helpers.warn(`[tnp-helpers] Trying to parse no a string...`)
      return jsonInstring;
    }
    return (useJson5 ? json5.parse(jsonInstring) : JSON.parse(jsonInstring)) as T;
  }


  pathFromLink(filePath: string) {
    return fse.readlinkSync(filePath);
  }

  isLink(filePath: string) {

    if (os.platform() === 'win32') {
      filePath = path.win32.normalize(filePath);
      // console.log('extename: ', path.extname(filePath))
      return path.extname(filePath) === '.lnk';
    } else {
      if (!fse.existsSync(filePath)) {
        return false;
      }
      try {
        filePath = Helpers.removeSlashAtEnd(filePath);
        const command = `[[ -L "${filePath}" && -d "${filePath}" ]] && echo "symlink"`;
        // console.log(command)
        const res = Helpers.run(command, { output: false, biggerBuffer: false }).sync().toString()
        return res.trim() === 'symlink'
      } catch (error) {
        return false;
      }
    }
  }

  renameFolder(from: string, to: string, cwd?: string) {
    const command = `renamer --find  ${from}  --replace  ${to} *`;
    Helpers.run(command, { cwd }).sync()
  }

  createSymLink(existedFileOrFolder: string, destinationPath: string,
    options?: { continueWhenExistedFolderDoesntExists?: boolean; dontRenameWhenSlashAtEnd?: boolean; }) {


    // Helpers.log(`existedFileOrFolder ${existedFileOrFolder}`)
    // Helpers.log(`destinationPath ${destinationPath}`)

    options = options ? options : {};
    if (_.isUndefined(options.continueWhenExistedFolderDoesntExists)) {
      options.continueWhenExistedFolderDoesntExists = false;
    }
    if (_.isUndefined(options.dontRenameWhenSlashAtEnd)) {
      options.dontRenameWhenSlashAtEnd = false;
    }
    const { continueWhenExistedFolderDoesntExists, dontRenameWhenSlashAtEnd } = options;

    // console.log('Create link!')


    let target = existedFileOrFolder;
    let link = destinationPath;

    if (!fse.existsSync(existedFileOrFolder)) {
      if (continueWhenExistedFolderDoesntExists) {
        // just continue and create link to not existed folder
      } else {
        Helpers.error(`[helpers.createLink] target path doesn't exist: ${existedFileOrFolder}`)
      }
    }

    if (link === '.' || link === './') {
      link = process.cwd()
    }

    if (!path.isAbsolute(link)) {
      link = path.join(process.cwd(), link);
    }

    if (!path.isAbsolute(target)) {
      target = path.join(process.cwd(), target);
    }

    if (link.endsWith('/')) {
      link = path.join(link, path.basename(target))
    }

    if (!fse.existsSync(path.dirname(link))) {
      Helpers.mkdirp(path.dirname(link))
    }

    const resolvedLink = path.resolve(link);
    const resolvedTarget = path.resolve(target);
    const exactSameLocations = (resolvedLink === resolvedTarget);
    // const tagetIsLink = Helpers.isLink(resolvedTarget);
    // const exactSameLinks = (tagetIsLink && (fse.readlinkSync(resolvedTarget) === resolvedLink));
    // const exactSameOverrideTargetLink = (tagetIsLink && (fse.readlinkSync(resolvedTarget) === resolvedTarget));
    const exactSameOVerrideTarget = (
      !Helpers.isLink(resolvedLink)
      && Helpers.exists(resolvedLink)
      && !Helpers.isLink(resolvedTarget)
      && Helpers.exists(resolvedTarget)
      && Helpers.readFile(resolvedLink) === Helpers.readFile(resolvedTarget)
    );
    if (exactSameLocations) {
      Helpers.warn(`[createSymLink] Trying to link same location`);
      return;
    }
    // if (exactSameLinks) {
    //   Helpers.warn(`[createSymLink] Trying to link same link`);
    //   return;
    // }
    // if (exactSameOverrideTargetLink) {
    //   Helpers.warn(`[createSymLink] Trying to override same link with link to itself`);
    //   return;
    // }
    if (exactSameOVerrideTarget) {
      const linkContainerLink = Helpers.pathContainLink(resolvedLink);
      const targetContainerLink = Helpers.pathContainLink(resolvedTarget);
      if (
        (!linkContainerLink && targetContainerLink)
        || (linkContainerLink && !targetContainerLink)
      ) {
        Helpers.warn(`[createSymLink] Trying to override same file with link to itself:
        ${resolvedLink}
        to
        ${resolvedTarget}
        `);
        return;
      }
    }


    rimraf.sync(link);
    // Helpers.log(`target ${target}`)
    // Helpers.log(`link ${link}`)
    fse.symlinkSync(target, link)
  }

  pathContainLink(p: string) {
    let previous: string;
    while (true) {
      p = path.dirname(p);
      if (p === previous) {
        return false;
      }
      if (Helpers.isLink(p)) {
        return true;
      }
      if (!Helpers.exists(p)) {
        return false;
      }
      previous = p;
    }
  }

  isPlainFileOrFolder(filePath) {
    return /^([a-zA-Z]|\-|\_|\@|\#|\$|\!|\^|\&|\*|\(|\))+$/.test(filePath);
  }

  createMultiplatformLink(target: string, link: string) {

    if (this.isPlainFileOrFolder(link)) {
      link = path.join(process.cwd(), link);
    }

    let command: string;
    if (os.platform() === 'win32') {

      if (target.startsWith('./')) {
        target = path.win32.normalize(path.join(process.cwd(), path.basename(target)))
      } else {
        if (target === '.' || target === './') {
          target = path.win32.normalize(path.join(process.cwd(), path.basename(link)))
        } else {
          target = path.win32.normalize(path.join(target, path.basename(link)))
        }
      }
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
      target = path.win32.normalize(target)
      if (link === '.' || link === './') {
        link = process.cwd()
      }
      link = path.win32.normalize(link);
      // if (path.resolve(target) === path.resolve(link)) { // TODO
      //   Helpers.warn(`[createMultiplatformLink][win32] Trying to link same location`);
      //   return;
      // }
      command = "mklink \/D "
        + target
        + " "
        + link
        + " >nul 2>&1 "
    } else {
      if (target.startsWith('./')) {
        target = target.replace(/^\.\//g, '');
      }
      if (link === '.' || link === './') {
        link = process.cwd()
      }
      if (path.resolve(target) === path.resolve(link)) {
        Helpers.warn(`[createMultiplatformLink] Trying to link same location`);
        return;
      }
      command = `ln -sf "${link}" "${target}"`;
    }
    child.execSync(command);
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
    try {
      fse.copySync(source, destination, _.merge({
        overwrite: true,
        recursive: true
      }, options));
    } catch (error) {
      rimraf.sync(destination);
      fse.copySync(source, destination, _.merge({
        overwrite: true,
        recursive: true
      }, options));
    }
  }

  removeIfExists(absoluteFileOrFolderPath: string) {
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
    // console.log(`removeFileIfExists: ${absoluteFilePath}`)
    const { modifiedFiles } = options || { modifiedFiles: { modifiedFiles: [] } };
    if (fse.existsSync(absoluteFilePath)) {
      fse.unlinkSync(absoluteFilePath);
      modifiedFiles.modifiedFiles.push(absoluteFilePath);
    }
  }

  removeFolderIfExists(absoluteFolderPath: string, options?: { modifiedFiles?: Models.other.ModifiedFiles; }) {
    Helpers.log(`[helpers] Remove folder: ${absoluteFolderPath}`)
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

  exists(folderOrFilePath: string | string[]) {
    if (_.isArray(folderOrFilePath)) {
      folderOrFilePath = path.join(...folderOrFilePath);
    }
    if (!folderOrFilePath) {
      Helpers.warn(`[helpers][exists] Path is not a string, abort.. "${folderOrFilePath}"`, true);
      return false;
    }
    if (!path.isAbsolute(folderOrFilePath)) {
      Helpers.warn(`[helpers][exists] Path is not absolute, abort.. ${folderOrFilePath}`, true);
      return false;
    }
    return fse.existsSync(folderOrFilePath);
  }

  mkdirp(folderPath: string | string[]) {
    if (_.isArray(folderPath)) {
      folderPath = path.join(...folderPath);
    }
    if (!path.isAbsolute(folderPath)) {
      Helpers.warn(`[helpers][mkdirp] Path is not absolute, abort ${folderPath}`, true);
      return;
    }
    if (_.isString(folderPath) && folderPath.startsWith('/tmp ') && os.platform() === 'darwin') {
      Helpers.warn(`[helpers][mkdirp] On mac osx /tmp is changed to /private/tmp`, false);
      folderPath = folderPath.replace(`/tmp/`, '/private/tmp/');
    }
    if (fse.existsSync(folderPath)) {
      Helpers.warn(`[helpers][mkdirp] folder path already exists: ${folderPath}`, false);
    } else {
      fse.mkdirpSync(folderPath);
    }
  }


  findChildren<T>(location, createFn: (childLocation: string) => T): T[] {

    const notAllowed: RegExp[] = [
      '\.vscode', 'node\_modules',
      ..._.values(config.folder),
      'e2e', 'tmp.*', 'dist.*', 'tests', 'module', 'browser', 'bundle*',
      'components', '\.git', 'bin', 'custom'
    ].map(s => new RegExp(s))

    const isDirectory = source => fse.lstatSync(source).isDirectory()
    const getDirectories = source =>
      fse.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory)

    let subdirectories = getDirectories(location)
      .filter(f => {
        const folderNam = path.basename(f);
        return (notAllowed.filter(p => p.test(folderNam)).length === 0);
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
      ..._.values(config.folder),
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


  getRecrusiveFilesFrom(dir): string[] {
    let files = [];
    const readed = fse.readdirSync(dir).map(f => {
      const fullPath = path.join(dir, f);
      // console.log(`is direcotry ${fse.lstatSync(fullPath).isDirectory()} `, fullPath)
      if (fse.lstatSync(fullPath).isDirectory()) {
        Helpers.getRecrusiveFilesFrom(fullPath).forEach(aa => files.push(aa))
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
    return underscore.max(files, (f) => {
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
      omitFolders?: string[];
      omitFoldersBaseFolder?: string;
      copySymlinksAsFiles?: boolean;
      useTempFolder?: boolean;
    }) {
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
      options.filter = (src: string, dest: string) => {
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
          fse.copySync(sourceDir, destinationDir, options);
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

  /**
   * wrapper for fs.readFileSync
   */
  readFile(absoluteFilePath: string): string | undefined {
    if (!fse.existsSync(absoluteFilePath)) {
      return void 0;
    }
    return fse.readFileSync(absoluteFilePath, {
      encoding
    }).toString().trim()
  }

  readJson(absoluteFilePath: string, defaultValue = {}, useJson5 = false) {
    if (!fse.existsSync(absoluteFilePath)) {
      return {};
    }
    try {
      const fileContent = Helpers.readFile(absoluteFilePath);
      let json;
      json = Helpers.parse(fileContent, useJson5 || absoluteFilePath.endsWith('.json5'));
      return json;
    } catch (error) {
      return defaultValue;
    }
  }

  /**
   * wrapper for fs.writeFileSync
   */
  writeFile(absoluteFilePath: string | (string[]), input: string | object, dontWriteSameFile = true): boolean {
    if (_.isArray(absoluteFilePath)) {
      absoluteFilePath = path.join.apply(this, absoluteFilePath);
    }
    absoluteFilePath = absoluteFilePath as string;
    if (!fse.existsSync(path.dirname(absoluteFilePath))) {
      Helpers.mkdirp(path.dirname(absoluteFilePath));
    }

    if (_.isObject(input)) {
      input = Helpers.stringify(input);
    } else if (!_.isString(input)) {
      input = ''
    }
    if (dontWriteSameFile) {
      if (fse.existsSync(absoluteFilePath)) {
        const existedInput = Helpers.readFile(absoluteFilePath);
        if (input === existedInput) {
          // Helpers.log(`[helpers][writeFile] not writing same file (good thing): ${absoluteFilePath}`);
          return false;
        }
      }
    }

    fse.writeFileSync(absoluteFilePath, input, {
      encoding
    });
    return true;
  }
}
