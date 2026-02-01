//#region imports
import { ChildProcess, StdioOptions } from 'node:child_process';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'; // @backend
import { promisify } from 'node:util'; // @backend

import * as ncp from 'copy-paste'; // @backend
import * as semver from 'semver'; // @backend
import {
  chalk,
  chokidar,
  config,
  spawn,
  TAGS,
  UtilsFilesFoldersSync,
} from 'tnp-core/src';
import {
  child_process,
  crossPlatformPath,
  fse,
  os,
  path,
  UtilsDotFile,
  UtilsOs,
  UtilsTerminal,
} from 'tnp-core/src';
import { _, CoreModels, Utils } from 'tnp-core/src';
import { Helpers } from 'tnp-core/src';
import {
  createPrinter,
  createSourceFile,
  isShorthandPropertyAssignment,
  factory,
  getLeadingCommentRanges,
  isClassDeclaration,
  isSourceFile,
  NodeArray,
  ScriptKind,
  ScriptTarget,
  SourceFile,
  Statement,
  transform,
  TransformationContext,
  visitEachChild,
  Node,
  isFunctionDeclaration,
  isVariableStatement,
  isIdentifier,
  NodeFlags,
  isEnumDeclaration,
  isTypeAliasDeclaration,
  isInterfaceDeclaration,
  isModuleDeclaration,
  isExportAssignment,
  forEachChild,
  Declaration,
  getCombinedModifierFlags,
  ModifierFlags,
  SyntaxKind,
  isVariableDeclaration,
  isCallExpression,
  isPropertyAccessExpression,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  canHaveDecorators,
  getDecorators,
  visitNode,
  isExportDeclaration,
  isImportDeclaration,
  Expression,
  isNamedImports,
  isNamedExports,
  NewLineKind,
  TransformerFactory,
  isDecorator,
  isEmptyStatement,
  isExpressionStatement,
  isPropertyDeclaration,
  isMethodDeclaration,
  getTrailingCommentRanges,
  isArrayLiteralExpression,
  isExportSpecifier,
  flattenDiagnosticMessageText,
  DiagnosticCategory,
  createProgram,
  createCompilerHost,
  isModuleBlock,
  EmitHint,
  getModifiers,
  canHaveModifiers,
  isImportEqualsDeclaration,
  isGetAccessorDeclaration,
  SymbolFlags,
  ModuleKind,
  isQualifiedName,
  ScriptSnapshot,
  getDefaultLibFilePath,
  createLanguageService,
  CodeFixAction,
  ImportsNotUsedAsValues,
  transpileModule,
  isExternalModuleReference,
} from 'typescript';
import type * as ts from 'typescript';
import { CLASS } from 'typescript-class-helpers/src';
import type * as vscodeType from 'vscode';

import {
  applicationConfigTemplate,
  ngMergeConfigTemplate,
  serverNgPartTemplates,
} from './utils-helpers/application-config-template';
//#endregion

//#region utils npm
export namespace UtilsNpm {
  export const isProperVersion = (npmVersion: string) => {
    //#region @backendFunc
    return semver.valid(npmVersion) !== null;
    //#endregion
  };

  //#region utils npm / is special version
  export const isSpecialVersion = (version: string) => {
    return CoreModels.NpmSpecialVersions.includes(version);
  };
  //#endregion

  //#region utils npm /  clear version
  export const clearVersion = (
    version: string,
    options: {
      removePrefixes?: boolean;
      /**
       * Remove alpha, beta, rc, latest, next etc.
       */
      removeSuffix?: boolean;
    },
  ) => {
    options = options || {};
    const { removePrefixes, removeSuffix } = options || {};

    if (!version || isSpecialVersion(version)) {
      return version;
    }

    version = (version || '')
      .trim()
      .replace(new RegExp(Utils.escapeStringForRegEx('undefined'), 'g'), '0');

    if (removePrefixes) {
      version = version.replace('^', '').replace('~', '');
    }
    let [major, minor, patch, alphaOrBetaOrRc] = version.split('.');
    if (removeSuffix) {
      alphaOrBetaOrRc = '';
    }
    return fixMajorVerNumber(
      `${major}.${minor}.${patch}${
        alphaOrBetaOrRc ? '.' + alphaOrBetaOrRc : ''
      }`,
    );
  };
  //#endregion

  //#region utils npm / fix major version number
  export const fixMajorVerNumber = (version: string) => {
    if (!version || isSpecialVersion(version)) {
      return version;
    }
    version = (version || '')
      .trim()
      .replace(new RegExp(Utils.escapeStringForRegEx('undefined'), 'g'), '0');
    const splited = version.split('.');
    let [major, minor, patch, alphaOrBetaOrRc] = splited;
    if (splited.length === 1) {
      minor = '0';
      patch = '0';
    } else if (splited.length === 2) {
      patch = '0';
    }
    return `${major}.${minor}.${patch}${
      alphaOrBetaOrRc ? '.' + alphaOrBetaOrRc : ''
    }`;
  };
  //#endregion

  //#region utils npm / get latest version from npm
  type LatestType =
    | 'major'
    | 'minor'
    | 'patch'
    | { majorUpTo?: number; minorUpTo?: number };

  export const getLatestVersionFromNpm = async (
    packageName: string,
    options?: {
      currentPackageVersion?: string;
      latestType?: LatestType;
      skipAlphaBetaNext?: boolean;
    },
  ): Promise<string> => {
    //#region @backendFunc
    let {
      currentPackageVersion,
      latestType = 'major',
      skipAlphaBetaNext = true,
    } = options ?? {};

    const res = await fetch(`https://registry.npmjs.org/${packageName}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch npm metadata for ${packageName}`);
    }

    const json = await res.json();

    let versions = Object.keys(json.versions)
      .filter(v => semver.valid(v))
      .sort(semver.compare);

    if (skipAlphaBetaNext) {
      versions = versions.filter(v => !semver.prerelease(v));
    }

    if (!versions.length) {
      throw new Error(`No valid versions found for ${packageName}`);
    }

    // MAJOR → ignore current version
    if (latestType === 'major' || !currentPackageVersion) {
      return versions.at(-1)!;
    }

    currentPackageVersion = clearVersion(currentPackageVersion, {
      removePrefixes: true,
      removeSuffix: true,
    });

    const current = semver.parse(currentPackageVersion);
    if (!current) {
      throw new Error(
        `Invalid currentPackageVersion: ${currentPackageVersion}`,
      );
    }

    // MINOR → lock major
    if (latestType === 'minor') {
      const filtered = versions.filter(v => semver.major(v) === current.major);

      if (!filtered.length) {
        throw new Error(
          `No versions found for ${packageName} with major ${current.major}`,
        );
      }

      return filtered.at(-1)!;
    }

    // PATCH → lock major + minor
    if (latestType === 'patch') {
      const filtered = versions.filter(
        v =>
          semver.major(v) === current.major &&
          semver.minor(v) === current.minor,
      );

      if (!filtered.length) {
        throw new Error(
          `No versions found for ${packageName} ${current.major}.${current.minor}.x`,
        );
      }

      return filtered.at(-1)!;
    }

    throw new Error(`Unsupported latestType: ${latestType}`);
    //#endregion
  };
  //#endregion

  //#region utils npm / check if package version available
  export const checkIfPackageVersionAvailable = async (
    pkgName: string,
    pkgVersion: string,
  ): Promise<boolean> => {
    //#region @backendFunc
    const res = await fetch(
      `https://registry.npmjs.org/${pkgName}/${pkgVersion}`,
    );
    return res.status === 200;
    //#endregion
  };
  //#endregion

  //#region utils npm / get last major versions
  export const getLastMajorVersions = async (
    pkgName: string,
  ): Promise<string[]> => {
    //#region @backendFunc
    try {
      const res = await fetch(`https://registry.npmjs.org/${pkgName}`);
      const json = await res.json();
      return Object.keys(json.versions).filter(v =>
        v.startsWith(json['dist-tags'].latest.split('.')[0]),
      );
    } catch (error) {
      return [];
    }
    //#endregion
  };
  //#endregion

  //#region helpers / get last minor versions for major
  export const getLastMinorVersionsForMajor = async (
    majorVer: number,
    pkgName: string,
  ): Promise<string[]> => {
    //#region @backendFunc
    try {
      const res = await fetch(`https://registry.npmjs.org/${pkgName}`);
      const json = await res.json();
      return Object.keys(json.versions).filter(v =>
        v.startsWith(`${majorVer}.`),
      );
    } catch (error) {
      return [];
    }
    //#endregion
  };
  //#endregion

  //#region helpers / get version object
  export interface VersionObjectNpm {
    major: number;
    minor: number;
    patch: number;
  }
  export const getVerObj = (version: string): VersionObjectNpm => {
    //#region @backendFunc
    return version
      .replace('^', '')
      .replace('~', '')
      .split('.')
      .map(Number)
      .reduce((acc, c, i) => {
        if (i === 0) {
          return { ...acc, ['major']: c };
        } else if (i === 1) {
          return { ...acc, ['minor']: c };
        } else {
          return { ...acc, ['patch']: c };
        }
      }, {}) as any;
    //#endregion
  };
  //#endregion

  /**
   * @deprecated TODO remvoe
   */
  export const getLastVersions = async (
    pkgName: string,
    currentVerObj: VersionObjectNpm,
    latestVerObj: VersionObjectNpm,
  ): Promise<string[]> => {
    //#region @backendFunc
    let someLastVersion = Utils.uniqArray([
      ...(await UtilsNpm.getLastMajorVersions(pkgName)),
      ...(await UtilsNpm.getLastMinorVersionsForMajor(
        latestVerObj.major - 1,
        pkgName,
      )),
      ...(await UtilsNpm.getLastMinorVersionsForMajor(
        latestVerObj.major - 2,
        pkgName,
      )),
      ...(await UtilsNpm.getLastMinorVersionsForMajor(
        currentVerObj.major,
        pkgName,
      )),
      ...(await UtilsNpm.getLastMinorVersionsForMajor(
        currentVerObj.major - 1,
        pkgName,
      )),
      ...(await UtilsNpm.getLastMinorVersionsForMajor(
        currentVerObj.major - 2,
        pkgName,
      )),
    ])
      .sort((a, b) => {
        const aVerObj = UtilsNpm.getVerObj(a);
        const bVerObj = UtilsNpm.getVerObj(b);
        if (aVerObj.major === bVerObj.major) {
          if (aVerObj.minor === bVerObj.minor) {
            return aVerObj.patch - bVerObj.patch;
          }
          return aVerObj.minor - bVerObj.minor;
        }
        return aVerObj.major - bVerObj.major;
      })
      .reverse();
    return someLastVersion;
    //#endregion
  };
}
//#endregion

//#region utils http
export namespace UtilsHttp {
  //#region utils http / start http server
  export const startHttpServer = async (
    cwd: string,
    port: number,
    options?: {
      startMessage?: string;
    },
  ) => {
    //#region @backendFunc
    options = options || {};
    const express = require('express');
    const app = express();

    // Serve static files from the provided cwd
    app.use(express.static(cwd));

    // Catch-all to handle any invalid routes (404 errors)
    app.use((req, res) => {
      res.status(404).send('File not found');
    });

    Helpers.taskStarted(`Starting server.. http://localhost:${port}`);
    // Start the server
    const server = app.listen(port, () => {
      Helpers.taskDone(
        options.startMessage ||
          `Server started at http://localhost:${port}, serving files from ${cwd}`,
      );
    });

    return new Promise<void>((resolve, reject) => {
      // Handle Ctrl+C (SIGINT) gracefully
      process.on('SIGINT', () => {
        server.close(() => resolve());
      });
    });
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils md
export namespace UtilsMd {
  /**
   * extract assets pathes from .md file
   */
  export const getAssets = (mdfileContent: string): string[] => {
    //#region @backendFunc
    // Regular expressions for detecting assets
    const markdownImgRegex = /!\[.*?\]\((.*?)\)/g; // Markdown image syntax ![alt](src)
    const htmlImgRegex = /<img.*?src=["'](.*?)["']/g; // HTML image syntax <img src="path">

    const assets: string[] = [];

    let match: RegExpExecArray | null;

    // Extract Markdown image links
    while ((match = markdownImgRegex.exec(mdfileContent)) !== null) {
      assets.push(match[1]); // Get the image path
    }

    // Extract HTML image links
    while ((match = htmlImgRegex.exec(mdfileContent)) !== null) {
      assets.push(match[1]); // Get the image path
    }

    return assets.map(r => r.replace(new RegExp(/^\.\//), ''));
    //#endregion
  };

  export const getAssetsFromFile = (absPathToFile: string): string[] => {
    //#region @backendFunc
    if (!Helpers.exists(absPathToFile)) {
      return [];
    }
    if (path.extname('absPathToFile').toLowerCase() !== '.md') {
      return [];
    }
    return getAssets(Helpers.readFile(absPathToFile));
    //#endregion
  };

  /**
   * Extract links to other Markdown files from a given Markdown content.
   * @param mdfileContent
   */
  export const getLinksToOtherMdFiles = (mdfileContent: string): string[] => {
    //#region @backendFunc
    // Regex pattern to match Markdown and HTML links to .md files
    const mdLinkPattern = /\[.*?\]\(([^)]+\.md)\)/g; // Matches [text](link.md)
    // const htmlLinkPattern = /<a\s+href=["']([^"']+\.md)["'].*?>/g; // Matches <a href="link.md">

    const links = new Set<string>(); // Use a Set to avoid duplicate links

    // Find all Markdown-style links
    let match;
    while ((match = mdLinkPattern.exec(mdfileContent)) !== null) {
      links.add(match[1]);
    }

    // Find all HTML-style links
    // while ((match = htmlLinkPattern.exec(mdfileContent)) !== null) {
    //   links.add(match[1]);
    // }

    return Array.from(links); // Convert Set to Array and return
    //#endregion
  };

  export const moveAssetsPathsToLevelFromFile = (
    absFilePath: string,
    level = 1,
  ): string | undefined => {
    //#region @backendFunc
    if (!Helpers.exists(absFilePath)) {
      return undefined;
    }
    if (path.extname(absFilePath).toLowerCase() !== '.md') {
      return UtilsFilesFoldersSync.readFile(absFilePath, {
        readImagesWithoutEncodingUtf8: true,
      });
    }
    return UtilsMd.moveAssetsPathsToLevel(
      UtilsFilesFoldersSync.readFile(absFilePath),
      level,
    );
    //#endregion
  };

  /**
   * Move asset paths to a higher directory level by adding "../" before each path.
   *
   * @param mdfileContent - The content of the .md file.
   * @param level - The number of levels to go up (default is 1).
   * @returns The modified content with updated asset paths.
   */
  export const moveAssetsPathsToLevel = (
    mdfileContent: string,
    level = 1,
  ): string => {
    //#region @backendFunc
    mdfileContent = mdfileContent || '';
    // Regular expressions for detecting assets
    if (!mdfileContent) return '';

    const prefix = '../'.repeat(level);

    // Markdown images: ![alt](path)
    const markdownRegex = /(!\[.*?]\()(\.\/|(?:\.\.\/)+)([^\s)]+?)(\))/g;

    // HTML images: <img ... src="path" ...>
    // More flexible: capture src="anything starting with ./ or ../"
    const htmlRegex =
      /(<img\b[^>]*?\ssrc=["'])(\.\/|(?:\.\.\/)+)([^"']+)(["'][^>]*>)/gi;

    const result = mdfileContent
      // First handle Markdown images
      .replace(markdownRegex, (match, before, rel, path, after) => {
        return `${before}${prefix}${path}${after}`;
      })
      // Then handle HTML images
      .replace(htmlRegex, (match, before, rel, path, after) => {
        return `${before}${prefix}${path}${after}`;
      });

    return result;
    //#endregion
  };
}
//#endregion

//#region utils quickfixes
export namespace UtilsQuickFixes {
  //#region replace sql-wasm.js faulty code content
  /**
   *
   * @param node_modules/sql.js/dist/sql-wasm.js
   */
  export const replaceKnownFaultyCode = (
    contentofSQLWasmJS: string,
  ): string => {
    //#region @backendFunc
    // console.log(`

    //   Applying quick fix for faulty minifed code

    //   `);
    const replace = [
      [
        [
          `var packageJson = JSON.parse(fs.readFileSync`,
          `(__nccwpck_require__.ab `,
          `+ "package.json").toString());`,
        ].join(''),
        [
          `var packageJson = JSON.parse(fs.existsSync`,
          `(__nccwpck_require__.ab + `,
          `"package.json") && fs.readFileSync(__nccwpck_require__.ab + "package.json").toString());`,
        ].join(''),
      ],
      [
        [
          `var packageJson = JSON.parse(fs.readFileSync`,
          `(path.join(__dirname, "../package.json")).toString());`,
        ].join(''),
        [
          `var packageJson = JSON.parse(fs.existsSync`,
          `(path.join(__dirname, "../package.json")) &&`,
          ` fs.readFileSync(path.join(__dirname, "../package.json")).toString());`,
        ].join(''),
      ],
      [
        [`module = `, `undefined;`].join(''),
        [`/* module =`, ` undefined ; */`].join(''),
      ],
    ];
    replace.forEach(r => {
      contentofSQLWasmJS = contentofSQLWasmJS.replace(r[0], r[1]);
    });
    return contentofSQLWasmJS;
    //#endregion
  };
  //#endregion

  /**
   * for some reason electron is being bundled - and it is not needed for cli
   */
  export const replaceElectronWithNothing = (
    jsContent: string,
    packageName: string,
  ): string => {
    //#region @backendFunc
    return jsContent
      .replace(
        new RegExp(
          Utils.escapeStringForRegEx(
            `mod${'ule.exports'} = ${'requ' + 'ire'}("${packageName}");`,
          ),
          'g',
        ),
        `/* --- replaced ${packageName} --- */`,
      )
      .replace(
        new RegExp(
          Utils.escapeStringForRegEx(
            `var ${_.snakeCase(packageName)}_1 = ${
              'req' + 'uire'
            }("${packageName}");`,
          ),
          'g',
        ),
        `/* --- replaced ${packageName} --- */`,
      );
    // var electron_1 = require("electron");
    //#endregion
  };
}
//#endregion

//#region utils vscode
export namespace UtilsVSCode {
  export const calculateContrastingHexColor = (hex: string): string => {
    // Normalize shorthand format like "#abc" → "#aabbcc"
    if (hex.length === 4) {
      hex =
        '#' +
        hex
          .slice(1)
          .split('')
          .map(ch => ch + ch)
          .join('');
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // YIQ contrast formula
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;

    return yiq >= 128 ? '#000000' : '#ffffff';
  };

  // Convert HSL to HEX if you need HEX output
  const hslToHex = (hsl: string): string => {
    const [_, hStr, sStr, lStr] = hsl.match(/hsl\((\d+), (\d+)%?, (\d+)%?\)/)!;
    let h = parseInt(hStr) / 360;
    let s = parseInt(sStr) / 100;
    let l = parseInt(lStr) / 100;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  export const generateFancyColor = (): string => {
    const h = Math.floor(Math.random() * 360); // full hue range
    const s = Math.floor(40 + Math.random() * 30); // 40–70% saturation
    const l = Math.floor(35 + Math.random() * 25); // 35–60% lightness

    return hslToHex(`hsl(${h}, ${s}%, ${l}%)`);
  };

  export const vscodeImport = () => {
    //#region @backendFunc
    if (!UtilsOs.isRunningInVscodeExtension()) {
      return {} as typeof vscodeType;
    }
    const vscode = require('vsc' + 'ode');
    return vscode as typeof vscodeType;
    //#endregion
  };

  export const regenerateVsCodeSettingsColors = (
    cwd: string,
    overideBottomColor?: string,
  ): void => {
    //#region @backendFunc
    const vscodePath = crossPlatformPath([cwd, '.vscode']);
    const settingsAbsPath = crossPlatformPath([vscodePath, 'settings.json']);
    if (!Helpers.exists(settingsAbsPath)) {
      Helpers.writeFile(settingsAbsPath, '{}');
    }
    const currentSettingsValue = Helpers.readJson(settingsAbsPath);

    const fanyColor = UtilsVSCode.generateFancyColor();

    if (!overideBottomColor) {
      currentSettingsValue['workbench.colorCustomizations'] = {
        'activityBar.background': fanyColor,
      };
    }

    currentSettingsValue['workbench.colorCustomizations'][
      'statusBar.background'
    ] = overideBottomColor ? overideBottomColor : fanyColor;

    currentSettingsValue['workbench.colorCustomizations'][
      'statusBar.debuggingBackground'
    ] = `#15d8ff`; // nice blue for debugging

    Helpers.writeJson(settingsAbsPath, currentSettingsValue);
    //#endregion
  };
}

//#endregion

//#region utils zip browser
export namespace UtilsZipBrowser {
  // <input type="file" id="folderInput" webkitdirectory />
  // ts
  // Copy
  // Edit
  // document.getElementById('folderInput').addEventListener('change', async (e) => {
  //   const input = e.target as HTMLInputElement;
  //   if (input.files) {
  //     const zipBlob = await zipDirBrowser(input.files);
  //     // Save the zip using FileSaver.js or URL.createObjectURL
  //     const url = URL.createObjectURL(zipBlob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'folder.zip';
  //     a.click();
  //     URL.revokeObjectURL(url);
  //   }
  // });

  // import JSZip from 'jszip';

  //   <input type="file" id="zipInput" />
  // ts
  // Copy
  // Edit
  // document.getElementById('zipInput').addEventListener('change', async (e) => {
  //   const input = e.target as HTMLInputElement;
  //   if (input.files?.[0]) {
  //     const entries = await unzipArchiveBrowser(input.files[0]);
  //     for (const [name, blob] of entries) {
  //       console.log(`Extracted file: ${name}`, blob);
  //     }
  //   }
  // });
  export const zipDirBrowser = async (fileList: FileList): Promise<Blob> => {
    //   const zip = new JSZip();

    //   for (const file of Array.from(fileList)) {
    //     const relativePath = (file as any).webkitRelativePath || file.name;
    //     zip.file(relativePath, file);
    //   }

    //   return zip.generateAsync({ type: 'blob' });
    return void 0;
  };

  export const unzipArchiveBrowser = async (
    zipBlob: Blob,
  ): Promise<Map<string, Blob>> => {
    //   const zip = await JSZip.loadAsync(zipBlob);
    //   const files = new Map<string, Blob>();

    //   for (const [filePath, fileObj] of Object.entries(zip.files)) {
    //     if (!fileObj.dir) {
    //       const content = await fileObj.async('blob');
    //       files.set(filePath, content);
    //     }
    //   }

    //   return files;
    return void 0;
  };
}
//#endregion

//#region utils zip node
export namespace UtilsZip {
  //#region split zip file

  export const splitFile7Zip = async (
    inputPath: string,
    partSizeMB = 99,
  ): Promise<number> => {
    //#region @backendFunc
    const stat = fse.statSync(inputPath);
    const partSize = partSizeMB * 1024 * 1024;

    if (stat.size <= partSize) {
      console.log('File is smaller than part size — no split needed.');
      return 0;
    }

    const { path7za } = await import('7zip-bin');

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const dirname = path.dirname(inputPath);
    const output7zPath = path.join(dirname, `${baseName}.7z`);

    return new Promise((resolve, reject) => {
      const args = [
        'a', // Add to archive
        output7zPath,
        inputPath,
        `-v${partSizeMB}m`, // ✅ Volume split flag
        '-mx=0', // No compression (optional: speeds it up)
      ];

      const proc = child_process.spawn(path7za, args, { stdio: 'inherit' });

      proc.on('close', async code => {
        if (code !== 0)
          return reject(new Error(`7za failed with code ${code}`));

        try {
          const files = await fse.readdir(dirname);
          const partFiles = files.filter(
            f =>
              f.startsWith(`${baseName}.7z.`) &&
              /^[0-9]{3}$/.test(f.split('.').pop() || ''),
          );

          const count = partFiles.length;
          console.log(`✅ Created ${count} part(s):`, partFiles);
          resolve(count);
        } catch (err) {
          reject(err);
        }
      });
    });
    //#endregion
  };

  /**
   * Splits a file into smaller parts if its size exceeds the specified part size.
   * @returns true if file was split, false if not needed
   */
  export const splitFile = async (
    inputPath: string,
    partSizeMB = 99,
  ): Promise<number> => {
    //#region @backendFunc
    const stat = fse.statSync(inputPath);
    const partSize = partSizeMB * 1024 * 1024;

    if (stat.size <= partSize) {
      console.log('File is smaller than part size — no split needed.');
      return 0;
    }

    return await new Promise<number>((resolve, reject) => {
      const baseName = path.basename(inputPath);
      const dirname = path.dirname(inputPath);
      const input = fse.createReadStream(inputPath);
      let partIndex = 0;
      let written = 0;
      let currentStream = fse.createWriteStream(`${baseName}.part${partIndex}`);

      input.on('data', chunk => {
        let offset = 0;

        while (offset < chunk.length) {
          if (written >= partSize) {
            currentStream.end();
            partIndex++;
            currentStream = fse.createWriteStream(
              crossPlatformPath([dirname, `${baseName}.part${partIndex}`]),
            );
            written = 0;
          }

          const toWrite = Math.min(partSize - written, chunk.length - offset);
          currentStream.write(chunk.slice(offset, offset + toWrite));
          written += toWrite;
          offset += toWrite;
        }
      });

      input.on('end', () => {
        currentStream.end(() => {
          console.log(`✅ Done splitting into ${partIndex + 1} parts.`);
          resolve(partIndex + 1);
        });
      });

      input.on('error', reject);
      currentStream.on('error', reject);
    });
    //#endregion
  };
  //#endregion

  /**
   * @returns absolute path to zip file
   */
  export const zipDir = async (
    absPathToDir: string,
    options?: {
      /**
       * default false
       */
      overrideIfZipFileExists?: boolean;
    },
  ): Promise<string> => {
    //#region @backendFunc
    const zipPath = `${path.basename(absPathToDir)}.zip`;
    const destinationFilePath = crossPlatformPath([
      path.dirname(absPathToDir),
      zipPath,
    ]);
    if (options.overrideIfZipFileExists) {
      try {
        Helpers.removeFileIfExists(destinationFilePath);
      } catch (error) {}
    }
    if (Helpers.exists(destinationFilePath)) {
      Helpers.info(
        `[${config.frameworkName}-helpers] Zip file already exists: ${destinationFilePath}`,
      );
      return destinationFilePath;
    }
    const yazl = await import('yazl'); // Use default import for yazl
    const pipeline = (await import('stream/promises')).pipeline;

    const zipfile = new yazl.ZipFile();

    const addDirectoryToZip = async (dir: string, basePath: string) => {
      const entries = await fse.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(basePath, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          await addDirectoryToZip(fullPath, basePath);
        } else if (entry.isFile()) {
          zipfile.addFile(fullPath, relPath);
        }
      }
    };
    await addDirectoryToZip(absPathToDir, absPathToDir);
    zipfile.end();
    await pipeline(
      zipfile.outputStream,
      fse.createWriteStream(destinationFilePath),
    );
    return destinationFilePath;
    //#endregion;
  };

  // Unzip: `/some/path/folder.zip` → `/some/path/folder`
  export const unzipArchive = async (absPathToZip: string): Promise<void> => {
    //#region @backendFunc
    const yauzl = await import('yauzl'); // Use default import for yauzl
    const { mkdir, stat } = await import('fs/promises'); // Use default import for fs
    const pipeline = (await import('stream/promises')).pipeline;

    const extractTo = absPathToZip.replace(/\.zip$/, '');
    await mkdir(extractTo, { recursive: true });
    return new Promise<void>((resolve, reject) => {
      yauzl.open(absPathToZip, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) return reject(err);
        zipfile.readEntry();
        zipfile.on('entry', async entry => {
          const filePath = path.join(extractTo, entry.fileName);
          if (/\/$/.test(entry.fileName)) {
            await mkdir(filePath, { recursive: true });
            zipfile.readEntry();
          } else {
            await mkdir(path.dirname(filePath), { recursive: true });
            zipfile.openReadStream(entry, async (err, readStream) => {
              if (err || !readStream) return reject(err);
              const writeStream = fse.createWriteStream(filePath);
              await pipeline(readStream, writeStream);
              zipfile.readEntry();
            });
          }
        });
        zipfile.on('end', () => resolve());
        zipfile.on('error', reject);
      });
    });
    //#endregion
  };
}
//#endregion

//#region utils worker
export namespace UtilsTaonWorker {
  export const getUniqueForTask = (
    task: string,
    location: string | string[],
  ): string => {
    if (!location) {
      throw new Error(
        '[UtilsTaonWorker.getUniqueForTask()] Location must be provided',
      );
    }
    if (!task) {
      throw new Error(
        '[UtilsTaonWorker.getUniqueForTask()] Task must be provided',
      );
    }
    location = crossPlatformPath(location);
    return `task(${task?.trim()}) in ${location}`?.trim();
  };
}
//#endregion

//#region utils java
export namespace UtilsJava {
  //#region select jdk version
  export const selectJdkVersion = async (): Promise<string | undefined> => {
    //#region @backendFunc
    Helpers.taskStarted(`Looking for JDK versions...`);
    const platform = os.platform();
    let currentJava = '';
    let currentJavaLocation = '';

    try {
      currentJava = child_process
        .execSync('java -version 2>&1')
        .toString()
        .split('\n')[0];
      currentJavaLocation = child_process
        .execSync('which java')
        .toString()
        .trim();
    } catch {
      currentJava = '-- no selected --';
      currentJavaLocation = '--';
    }

    console.log(`\nCURRENT JAVA GLOBAL VERSION: ${currentJava}`);
    if (currentJavaLocation !== '--') {
      console.log(`FROM: ${currentJavaLocation}\n`);
    }

    let javaVersions: { version: string; path: string }[] = [];

    if (platform === 'darwin') {
      try {
        const result = child_process
          .execSync('/usr/libexec/java_home -V 2>&1')
          .toString()
          .split('\n')
          .filter(l => l.includes('/Library/Java/JavaVirtualMachines'))
          .map(l => {
            const match = l.match(/(\/Library\/.*?\/Contents\/Home)/);
            if (match) {
              const version =
                l.match(/(?:jdk-|JDK )([\d._]+)/)?.[1] ?? 'unknown';
              return { version, path: match[1] };
            }
          })
          .filter(Boolean) as { version: string; path: string }[];

        javaVersions.push(...result);
      } catch {
        console.warn('No versions found via /usr/libexec/java_home');
      }

      // ✅ Extra fallback for Homebrew + Corretto
      const fallbackDirs = [
        '/Library/Java/JavaVirtualMachines',
        '/usr/local/Cellar',
        '/opt/homebrew/Cellar',
      ];

      for (const baseDir of fallbackDirs) {
        try {
          const dirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of dirs) {
            if (dir.isDirectory() && /(jdk|corretto|openjdk)/i.test(dir.name)) {
              // Cellar layout: .../openjdk@21/<version>/libexec/openjdk.jdk/Contents/Home
              const homePath = baseDir.includes('Cellar')
                ? path.join(
                    baseDir,
                    dir.name,
                    fse.readdirSync(path.join(baseDir, dir.name))[0],
                    'libexec',
                    'openjdk.jdk',
                    'Contents',
                    'Home',
                  )
                : path.join(baseDir, dir.name, 'Contents', 'Home');

              javaVersions.push({
                version: detectJavaVersionMacOS(homePath),
                path: homePath,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    } else if (platform === 'linux') {
      const knownPaths = ['/usr/lib/jvm', '/usr/java', '/opt/java', '/opt/jdk'];

      for (const basePath of knownPaths) {
        try {
          const dirs = fse.readdirSync(basePath, { withFileTypes: true });
          for (const dir of dirs) {
            if (dir.isDirectory() && /(jdk|java|corretto)/i.test(dir.name)) {
              const versionMatch = dir.name.match(/(\d+(?:\.\d+)+)/);
              javaVersions.push({
                version: versionMatch?.[1] ?? dir.name,
                path: path.join(basePath, dir.name),
              });
            }
          }
        } catch {
          // ignore
        }
      }
    } else if (platform === 'win32') {
      try {
        const output = child_process.execSync(
          'reg query "HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit"',
          { encoding: 'utf8' },
        );
        const lines = output
          .split('\n')
          .filter(line => line.includes('JavaSoft\\Java Development Kit'));
        for (const line of lines) {
          const version = line.trim().split('\\').pop()!;
          const pathOutput = child_process.execSync(
            `reg query "${line.trim()}" /v JavaHome`,
            {
              encoding: 'utf8',
            },
          );
          const match = pathOutput.match(/JavaHome\s+REG_SZ\s+(.+)/);
          if (match) {
            javaVersions.push({
              version,
              path: match[1].trim(),
            });
          }
        }
      } catch {
        // Ignore registry failure
      }

      // Fallback dirs
      const fallbackDirs = [
        'C:\\Program Files\\Amazon Corretto',
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Zulu',
        'C:\\Java',
      ];

      for (const baseDir of fallbackDirs) {
        try {
          const subdirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of subdirs) {
            if (
              dir.isDirectory() &&
              /(jdk|corretto|zulu|temurin)/i.test(dir.name)
            ) {
              const versionMatch = dir.name.match(/(\d+(?:\.\d+)+)/);
              javaVersions.push({
                version: versionMatch?.[1] ?? dir.name,
                path: path.join(baseDir, dir.name),
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    javaVersions = javaVersions
      .filter(j => j.version !== 'unknown') // drop unknowns
      .filter(
        (j, index, self) =>
          index ===
          self.findIndex(
            other => path.resolve(other.path) === path.resolve(j.path),
          ),
      );

    if (javaVersions.length === 0) {
      console.log('❌ No installed Java versions found.');
      return;
    }

    const selected = await UtilsTerminal.select({
      question: 'Select Java version for global usage:',
      choices: javaVersions.map(j => ({
        name: `${j.version}  —  ${j.path}`,
        value: j,
      })),
    });

    return selected.path;
    //#endregion
  };
  //#endregion

  export const detectJavaVersionMacOS = (javaHome: string): string => {
    //#region @backendFunc
    try {
      // 1. Try to read "release" file shipped with every JDK
      const releaseFile = path.join(javaHome, 'release');
      if (fse.existsSync(releaseFile)) {
        const content = fse.readFileSync(releaseFile, 'utf8');
        const match = content.match(/JAVA_VERSION="([^"]+)"/);
        if (match) {
          return match[1];
        }
      }

      // 2. Try folder name (amazon-corretto-21.jdk → 21, valhalla-ea-23 → 23)
      const folder = path.basename(javaHome);
      const matchFolder = folder.match(/(\d+(?:\.\d+)?)/);
      if (matchFolder) {
        return matchFolder[1];
      }

      return folder; // fallback: show folder name
    } catch {
      return 'unknown';
    }
    //#endregion
  };

  //#region update java home path
  export const updateJavaHomePath = (selectedPath: string): void => {
    //#region @backendFunc
    const platform = os.platform();

    if (platform === 'darwin') {
      try {
        const shellPath = path.resolve(UtilsOs.getRealHomeDir(), '.zshrc'); // or .bash_profile
        child_process.execSync(`export JAVA_HOME="${selectedPath}"`);
        console.log(
          `✅ JAVA_HOME set to ${selectedPath} (only in current session).`,
        );
        console.log(
          `To make permanent, add to your shell profile:\n\nexport JAVA_HOME="${selectedPath}"\n`,
        );
      } catch (err) {
        console.error('❌ Failed to set JAVA_HOME on macOS.');
      }
    } else if (platform === 'linux') {
      try {
        child_process.execSync(`export JAVA_HOME="${selectedPath}"`);
        child_process.execSync(
          `sudo update-alternatives --set java "${selectedPath}/bin/java"`,
        );
        console.log(`✅ Set global Java to ${selectedPath}`);
      } catch {
        console.log(
          `⚠️ Could not update alternatives. Try manually:\nexport JAVA_HOME="${selectedPath}"`,
        );
      }
    } else if (platform === 'win32') {
      try {
        child_process.execSync(`setx JAVA_HOME "${selectedPath}"`);
        console.log(`✅ JAVA_HOME set globally to ${selectedPath}`);
        console.log(`⚠️ Restart your terminal or computer to apply changes.`);
      } catch {
        console.error('❌ Failed to set JAVA_HOME on Windows.');
      }
    }
    //#endregion
  };
  //#endregion

  //#region api methods / selectTomcatVersion
  export const selectTomcatVersion = async (): Promise<string> => {
    //#region @backendFunc
    const platform = os.platform();
    let currentTomcat = process.env.TOMCAT_HOME || '';
    let tomcatVersions: { version: string; path: string }[] = [];

    console.log('\n🔍 Searching for installed Tomcat versions...');

    if (currentTomcat) {
      console.log(`CURRENT TOMCAT_HOME: ${currentTomcat}\n`);
    }

    if (platform === 'darwin' || platform === 'linux') {
      // Extended search directories for macOS/Linux
      const searchDirs = [
        '/usr/local', // will check for tomcat* here
        '/opt',
        '/usr/share',
        crossPlatformPath([UtilsOs.getRealHomeDir(), 'tomcat']),
      ];

      for (const base of searchDirs) {
        try {
          if (!fse.existsSync(base)) continue;
          const subdirs = fse.readdirSync(base, { withFileTypes: true });
          for (const sub of subdirs) {
            if (
              sub.isDirectory() &&
              sub.name.toLowerCase().includes('tomcat')
            ) {
              const foundPath = path.join(base, sub.name);
              const versionGuess =
                sub.name.match(/(\d+\.\d+\.\d+)/)?.[1] || sub.name;
              tomcatVersions.push({
                version: versionGuess,
                path: foundPath,
              });
            }
          }
        } catch {
          // ignore errors
        }
      }
    } else if (platform === 'win32') {
      const fallbackDirs = [
        'C:\\Program Files\\Apache Software Foundation',
        'C:\\Tomcat',
      ];
      for (const baseDir of fallbackDirs) {
        try {
          if (!fse.existsSync(baseDir)) continue;
          const subdirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of subdirs) {
            if (
              dir.isDirectory() &&
              dir.name.toLowerCase().includes('tomcat')
            ) {
              const foundPath = path.join(baseDir, dir.name);
              const versionGuess =
                dir.name.match(/(\d+\.\d+\.\d+)/)?.[1] || dir.name;
              tomcatVersions.push({
                version: versionGuess,
                path: foundPath,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (tomcatVersions.length === 0) {
      console.log('❌ No Tomcat installations found.');
      return;
    }

    const selected = await UtilsTerminal.select({
      question: 'Select Tomcat installation for global usage:',
      choices: tomcatVersions.map(t => ({
        name: `Tomcat ${t.version} — ${t.path}`,
        value: t,
      })),
    });

    const selectedPath = selected.path;
    return selectedPath;
    //#endregion
  };
  //#endregion

  //#region update tomcat home path
  export const updateTomcatHomePath = (selectedPath: string): void => {
    //#region @backendFunc
    const platform = os.platform();
    if (platform === 'darwin' || platform === 'linux') {
      try {
        child_process.execSync(`export TOMCAT_HOME="${selectedPath}"`);
        console.log(
          `✅ TOMCAT_HOME set to ${selectedPath} (current session only).`,
        );
        console.log(
          `To make permanent, add to your ~/.zshrc or ~/.bashrc:\n\nexport TOMCAT_HOME="${selectedPath}"\n`,
        );
      } catch {
        console.error('❌ Failed to set TOMCAT_HOME.');
      }
    } else if (platform === 'win32') {
      try {
        child_process.execSync(`setx TOMCAT_HOME "${selectedPath}"`);
        console.log(`✅ TOMCAT_HOME set globally to ${selectedPath}`);
        console.log(`⚠️ Restart your terminal or computer to apply changes.`);
      } catch {
        console.error('❌ Failed to set TOMCAT_HOME on Windows.');
      }
    }
    //#endregion
  };
  //#endregion
}

//#endregion

//#region utils passwords
export namespace UtilsPasswords {
  //#region hash password
  export const hashPassword = (password: string): Promise<string> => {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const salt = randomBytes(16);
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        // store salt + hash (hex or base64)
        resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
      });
    });
    //#endregion
  };
  //#endregion

  //#region verify password
  export const verifyPassword = (
    password: string,
    stored: string,
  ): Promise<boolean> => {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const [saltHex, keyHex] = stored.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const key = Buffer.from(keyHex, 'hex');

      scrypt(password, salt, key.length, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(timingSafeEqual(key, derivedKey));
      });
    });
    //#endregion
  };
  //#endregion

  // Example
  // (async () => {
  //   const hash = await hashPassword('super-secret');
  //   console.log('stored:', hash);

  //   const ok = await verifyPassword('super-secret', hash);
  //   console.log('valid?', ok);
  // })();
}
//#endregion

//#region utils docker
export namespace UtilsDocker {
  //#region utils docker  / constants
  const DOCKER_TAON_PROJECT_LABEL_KEY = 'com.docker.compose.taon.project'; // change to your app name

  const DOCKER_TAON_PROJECT_LABEL_VALUE = 'true'; // change to your app name

  export const DOCKER_LABEL_KEY = 'com.docker.compose.project'; // change to your app name
  export const DOCKER_TAON_PROJECT_LABEL = `${DOCKER_TAON_PROJECT_LABEL_KEY}=${DOCKER_TAON_PROJECT_LABEL_VALUE}`;
  //#endregion

  //#region utils docker / clean images by docker label
  export const cleanImagesAndContainersByDockerLabel = async (
    labelKey: string,
    labelValue: string,
  ): Promise<void> => {
    //#region @backendFunc
    const label = `${labelKey}=${labelValue}`;
    const execAsync = promisify(child_process.exec);

    if (!(await UtilsOs.isDockerAvailable())) {
      Helpers.warn(
        'Docker is not available in the system. Skipping cleanup.',
        false,
      );
      return;
    }

    try {
      console.log(`🧹 Cleaning containers with label: ${label}`);
      const { stdout: containers } = await execAsync(
        `docker ps -a -q --filter "label=${label}"`,
      );
      if (containers.trim()) {
        await execAsync(
          `docker rm -f ${containers.trim().replace(/\s+/g, ' ')}`,
        );
        console.log(`✅ Removed containers:\n${containers}`);
      } else {
        console.log(`ℹ️ No containers found for label: ${label}`);
      }

      console.log(`🧹 Cleaning images with label: ${label}`);
      const { stdout: images } = await execAsync(
        `docker images -q --filter "label=${label}"`,
      );
      if (images.trim()) {
        await execAsync(`docker rmi -f ${images.trim().replace(/\s+/g, ' ')}`);
        console.log(`✅ Removed images:\n${images}`);
      } else {
        console.log(`ℹ️ No images found for label: ${label}`);
      }
    } catch (err: any) {
      console.error(
        `❌ Error cleaning Docker label ${label}:`,
        err.message || err,
      );
    }
    //#endregion
  };
  //#endregion

  //#region utils docker / models
  export interface DockerComposeActionOptions {
    composeFileName?: string;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    skipBuild?: boolean;
    stdio?: StdioOptions;
    useFirstYmlFound?: boolean;
  }

  export type DockerComposeActionType = 'up' | 'down';
  //#endregion

  //#region utils docker / get docker compose up/down command
  /**
   * @returns cmd + args array
   * you can use with child_process.spawn
   * const [cmd, ...args] = getDockerComposeActionCommand('up');
   * child.spawn(cmd, args, { ... });
   *
   * @param action 'up' | 'down'
   */
  export const getDockerComposeActionCommand = (
    action: DockerComposeActionType,
    options?: Omit<
      DockerComposeActionOptions,
      'cwd' | 'env' | 'stdio' | 'useFirstYmlFound'
    >,
  ): string[] => {
    options = options || {};
    options.skipBuild = !!options?.skipBuild;

    const composeFileName = options?.composeFileName || 'docker-compose.yml';

    return ['docker', 'compose', '-f', composeFileName].concat(
      action === 'up'
        ? options.skipBuild
          ? ['up']
          : ['up', '--build']
        : ['down'],
    );
  };
  //#endregion

  //#region utils docker /  get docker compose up/down child process
  export const getDockerComposeActionChildProcess = (
    action: DockerComposeActionType,
    options?: DockerComposeActionOptions,
  ): ChildProcess => {
    //#region @backendFunc
    options = options || {};

    const cwd = options?.cwd || process.cwd();
    const env = {
      ...process.env,
      ...(options?.env || {}),
    };

    if (options.useFirstYmlFound) {
      const foundYml = Helpers.getFilesFrom(cwd, { recursive: false }).find(
        f => f.endsWith('.yml') || f.endsWith('.yaml'),
      );
      options.composeFileName = foundYml ? path.basename(foundYml) : void 0;
    }

    const [cmd, ...args] = UtilsDocker.getDockerComposeActionCommand(
      action,
      options,
    );
    const child = child_process.spawn(cmd, args, {
      env,
      cwd,
      stdio: options.stdio || 'inherit', // inherit stdio so output shows in terminal
    });

    return child;
    //#endregion
  };
  //#endregion

  //#region utils docker / remove all taon containers and images from docker
  export const removeAllTaonContainersAndImagesFromDocker =
    async (): Promise<void> => {
      //#region @backendFunc
      await UtilsDocker.cleanImagesAndContainersByDockerLabel(
        DOCKER_TAON_PROJECT_LABEL_KEY,
        DOCKER_TAON_PROJECT_LABEL_VALUE,
      );
      //#endregion
    };
  //#endregion

  //#region utils docker / link podman as docker if necessary
  /**
   * @TODO @REFACTOR use async stuff
   */
  export const linkPodmanAsDockerIfNecessary = async (): Promise<void> => {
    //#region @backendFunc
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const isLinux = process.platform === 'linux';

    const hasDocker = await UtilsOs.commandExistsAsync('docker');
    const hasPodman = await UtilsOs.commandExistsAsync('podman');

    // Rule: if docker already exists → do nothing
    if (hasDocker) {
      console.log(
        'docker command already exists. Skipping Podman → docker linking.',
      );
      return;
    }

    // Rule: if no podman → nothing to do
    if (!hasPodman) {
      console.log('podman not found. Cannot create docker alias.');
      return;
    }

    console.log(
      'podman found, docker not found → creating docker → podman link...',
    );

    try {
      if (isLinux || isMac) {
        // Find podman binary path
        const podmanPath =
          Helpers.commandOutputAsString('command -v podman').trim();
        const dockerPath = crossPlatformPath(
          path.resolve('/usr/local/bin/docker'),
        );

        // Remove old symlink if broken
        Helpers.removeFileIfExists(dockerPath);

        Helpers.createSymLink(podmanPath, dockerPath);

        console.log(`Created symlink: ${dockerPath} → ${podmanPath}`);
      } else if (isWin) {
        // Windows: Best effort via Podman Desktop or WSL
        // Option 1: Try to use Podman Desktop's podman.exe (common location)
        const commonPaths = [
          `${process.env.LOCALAPPDATA}\\Programs\\Podman\\podman.exe`,
          `${process.env.ProgramFiles}\\RedHat\\Podman\\podman.exe`,
        ];

        let podmanExe = commonPaths.find(p => Helpers.exists(p));
        if (!podmanExe) {
          // Fallback: ask WSL for podman path
          try {
            podmanExe = Helpers.commandOutputAsString(
              'wsl podman --version',
            ).includes('podman version')
              ? 'wsl podman'.trim()
              : null;
          } catch {
            podmanExe = null;
          }
        }

        if (!podmanExe) {
          console.log(
            'Could not locate podman.exe or WSL podman. Skipping Windows shim.',
          );
          return;
        }

        // Create docker.bat in a user-writable PATH directory
        const userBin = crossPlatformPath(
          path.resolve(process.env.USERPROFILE || '', 'bin'),
        );
        const dockerBatPath = crossPlatformPath(
          path.resolve(userBin, 'docker.bat'),
        );

        // Ensure directory exists and is in PATH
        child_process.execSync(`mkdir "${userBin}" 2>nul`, {
          shell: 'cmd.exe',
        });
        const pathAdd = `setx PATH "%PATH%;${userBin}"`;
        child_process.execSync(pathAdd, { shell: 'cmd.exe', stdio: 'ignore' });

        const batContent = podmanExe.startsWith('wsl')
          ? `@echo off\r\nwsl podman %*`
          : `@echo off\r\n"${podmanExe}" %*`;

        require('fs').writeFileSync(dockerBatPath, batContent);
        console.log(`Created docker.bat shim → ${dockerBatPath}`);
        console.log(
          'Note: You may need to restart your terminal for PATH to update.',
        );
      }

      console.log('Successfully linked docker → podman');
    } catch (err) {
      console.error(
        'Failed to create docker → podman link:',
        err instanceof Error ? err.message : err,
      );
    }
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils file sync
/**
 * ! TODO @IN_PROGRESS @LAST
 */
export namespace UtilsFileSync {
  //#region constants
  // ───── SAFETY SETTINGS ─────────────────────────────
  // Minimum realistic photo/video size (in bytes) before we even try
  const MIN_PHOTO_SIZE = 50_000; // ~50 KB — anything smaller is probably placeholder
  const MIN_VIDEO_SIZE = 500_000; // ~500 KB

  // How long we wait after the file stops growing before processing
  const STABILIZATION_MS = 5000; // 5 seconds is bulletproof

  //#region @backend
  const execAsync = promisify(child_process.exec);
  //#endregion

  //#endregion

  //#region models
  interface FoldersSyncOptions {
    androidFolder: string;
    macPhotosLibrary: string;
    tempConvertFolder: string;
    /**
     * If true, skips the terminal menu confirmation on startup
     * (default: false) - perfect for automated scripts
     */
    skipTerminalMenu?: boolean;
    /**
     * for testing purposes only
     */
    onlyProcessFiles?: string[]; // optional list of filenames to only process (for testing)
  }

  interface WacherData extends FoldersSyncOptions {
    processed: Set<string>;
    pending: Map<string, NodeJS.Timeout>;
  }
  //#endregion

  //#region for folders
  export const forFolders = async (
    folder: FoldersSyncOptions,
  ): Promise<void> => {
    //#region @backendFunc

    const hasFFmpeg = await UtilsOs.commandExistsAsync('ffmpeg');
    if (!hasFFmpeg) {
      Helpers.error(
        `FFmpeg is not installed or not available in PATH. Please install FFmpeg to use the safe watcher.`,
      );
      return;
    }
    const hasFFprobe = await UtilsOs.commandExistsAsync('ffprobe');
    if (!hasFFprobe) {
      Helpers.error(
        `FFprobe is not installed or not available in PATH. Please install FFprobe to use the safe watcher.`,
      );
      return;
    }

    //#region watcher setup
    await fse.mkdirp(folder.tempConvertFolder);

    const processed = new Set<string>();
    const pending = new Map<string, NodeJS.Timeout>();

    const watcherData: WacherData = {
      ...folder,
      processed,
      pending,
    };
    //#endregion

    //#region terminal menu
    Helpers.info(
      `Starting safe watcher with the following settings:
    ${chalk.bold('Android folder')}:\n${folder.androidFolder}
    ${chalk.bold('MacOS Photos library')}:\n${folder.macPhotosLibrary}
    Temporary conversion folder:\n${folder.tempConvertFolder}

    `,
    );

    if (!folder.skipTerminalMenu) {
      const proceed = await UtilsTerminal.confirm({
        message: `Proceed with starting the watcher?`,
      });
    }

    //#endregion

    // ───── MAIN WATCHER ─────────────────────────────────
    chokidar
      .watch(folder.androidFolder, {
        //#region watcher options
        ignored: /(^|[\/\\])\../,
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
          stabilityThreshold: STABILIZATION_MS,
          pollInterval: 500,
        },
        // On Windows 11 + MTP devices, native events are unreliable → force polling
        usePolling: true,
        interval: 2000,
        binaryInterval: 3000,
        //#endregion
      })
      .on('add', filePath => {
        //#region handle add
        // Clear any old timer
        if (pending.has(filePath)) clearTimeout(pending.get(filePath));

        // Wait until the file stops growing for STABILIZATION_MS
        const timer = setTimeout(() => {
          pending.delete(filePath);
          safeProcess(filePath);
        }, STABILIZATION_MS + 1000);

        pending.set(filePath, timer);
        //#endregion
      })
      .on('change', filePath => {
        //#region handle change
        // File is still being written → reset timer
        if (pending.has(filePath)) clearTimeout(pending.get(filePath));
        pending.set(
          filePath,
          setTimeout(() => {
            pending.delete(filePath);
            safeProcess(filePath);
          }, STABILIZATION_MS),
        );
        //#endregion
      });

    //#region log startup info
    console.log(`Safe watcher started`);
    console.log(`Android folder : ${watcherData.androidFolder}`);
    console.log(`macOS Photos   : ${watcherData.macPhotosLibrary}`);
    console.log(
      `Waiting ${STABILIZATION_MS / 1000}s after file stops growing...`,
    );
    //#endregion

    //#endregion
  };
  //#endregion

  //#region is hevc
  async function isHevc(file: string): Promise<boolean> {
    //#region @backendFunc
    try {
      const { stdout } = await execAsync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${file}"`,
      );
      const codec = stdout.trim(); // ← remove newline
      return codec === 'hevc' || codec === 'hvc1'; // both mean HEVC/H.265
    } catch {
      return false;
    }
    //#endregion
  }
  //#endregion

  //#region safe process
  const safeProcess = async (
    filePath: string,
    wacherData?: WacherData,
  ): Promise<void> => {
    //#region @backendFunc
    if (wacherData.processed.has(filePath)) return;

    const ext = path.extname(filePath).toLowerCase();
    const stat = await fse.stat(filePath);

    // ───── REJECT OBVIOUS PLACEHOLDERS ─────────────────
    if (stat.size < 10_000) {
      console.log(
        `Skipped tiny/placeholder file: ${path.basename(filePath)} (${
          stat.size
        } bytes)`,
      );
      wacherData.processed.add(filePath);
      return;
    }

    // ───── REJECT TOO-SMALL PHOTOS/VIDEOS ───────────────
    const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(ext);
    const minSize = isVideo ? MIN_VIDEO_SIZE : MIN_PHOTO_SIZE;

    if (stat.size < minSize) {
      console.log(
        `Still downloading or placeholder → ${path.basename(filePath)} (${(
          stat.size /
          1024 /
          1024
        ).toFixed(1)} MB)`,
      );
      return; // don't mark as processed yet — wait for it to grow
    }

    wacherData.processed.add(filePath);
    const filename = path.basename(filePath);

    try {
      if (ext === '.heic' || ext === '.heif') {
        // HEIC can be copied directly — Apple Photos loves them
        await fse.copyFile(
          filePath,
          path.join(wacherData.macPhotosLibrary, filename),
        );
        console.log(
          `HEIC copied: ${filename} (${(stat.size / 1024 / 1024).toFixed(
            1,
          )} MB)`,
        );
      } else if (isVideo && (await isHevc(filePath))) {
        const outName = filename.replace(/\.[^.]+$/, '_iphone.mp4');
        const tempOut = path.join(wacherData.tempConvertFolder, outName);
        console.log(
          `Converting HEVC → H.264: ${filename} (${(
            stat.size /
            1024 /
            1024
          ).toFixed(1)} MB)`,
        );
        await execAsync(
          `ffmpeg -i "${filePath}" -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "${tempOut}" -y`,
        );
        await fse.copyFile(
          tempOut,
          path.join(wacherData.macPhotosLibrary, outName),
        );
        console.log(`Converted: ${outName}`);
      } else {
        await fse.copyFile(
          filePath,
          path.join(wacherData.macPhotosLibrary, filename),
        );
        console.log(
          `Copied: ${filename} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`,
        );
      }
    } catch (err) {
      console.error(`Failed ${filename}:`, (err as Error).message);
      wacherData.processed.delete(filePath); // retry later if it was a temporary error
    }
    //#endregion
  };
  //#endregion
}
//#endregion

export namespace UtilsClipboard {
  export const copyText = async (textToCopy: string): Promise<void> => {
    //#region @backend
    await new Promise(resolve => {
      ncp.copy(textToCopy, function () {
        Helpers.log(`Copied to clipboard !`);
        resolve(void 0);
      });
    });
    //#endregion

    //#region @browser
    if (typeof navigator !== 'undefined') {
      // Preferred modern API
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        return;
      }

      // Fallback (older browsers / restricted permissions)
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    }
    //#endregion
  };

  export const pasteText = async (): Promise<string> => {
    //#region @backend
    return await new Promise<string>((resolve, reject) => {
      ncp.paste(function (__, p) {
        Helpers.log(`Paster from to clipboard !`);
        resolve(p);
      });
    });
    //#endregion

    //#region @browser
    if (typeof navigator !== 'undefined') {
      // Preferred modern API
      if (navigator.clipboard?.readText) {
        return await navigator.clipboard.readText();
      }

      // Fallback (best-effort)
      const textarea = document.createElement('textarea');
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';

      document.body.appendChild(textarea);
      textarea.focus();

      try {
        document.execCommand('paste');
        return textarea.value;
      } finally {
        document.body.removeChild(textarea);
      }
    }
    //#endregion

    return '';
  };
}
