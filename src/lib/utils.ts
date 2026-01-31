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

//#region utils typescript

export namespace UtilsTypescript {
  //#region remove region by name
  /**
   * Remove TypeScript region blocks by their name, including nested regions.
   *
   * @param sourceCode - The TypeScript source code as a string.
   * @param regionName - The name of the region to remove.
   * @returns Modified TypeScript code without the specified regions.
   */
  export const removeRegionByName = (
    sourceCode: string,
    regionName: string,
  ): string => {
    //#region @backendFunc
    // Create a source file using TypeScript's compiler API
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    // Prepare a printer to convert the modified AST back to code
    const printer = createPrinter();

    // Traverse the AST and remove specified //#region blocks
    const transformer = <T extends Node>(context: TransformationContext) => {
      const visit = (node: T): T | undefined => {
        // @ts-ignore
        if (isSourceFile(node)) {
          const statements = removeRegions(node.statements, regionName);
          // @ts-ignore
          return factory.updateSourceFile(node, statements) as T;
        }
        // @ts-ignore
        return visitEachChild(node, visit, context);
      };

      return visit;
    };

    // Apply the transformation
    // @ts-ignore
    const result = transform(sourceFile, [transformer]);

    // Get the modified source file
    const transformedSourceFile = result.transformed[0] as SourceFile;

    // Print the transformed source file back to a string
    const modifiedCode = printer.printFile(transformedSourceFile);

    result.dispose();

    return modifiedCode;
    //#endregion
  };

  /**
   * Removes the specified region blocks and handles nested regions.
   *
   * @param statements - List of statements in the source file.
   * @param regionName - The name of the region to remove.
   * @returns Modified list of statements without the specified regions.
   */
  const removeRegions = (
    statements: NodeArray<Statement>,
    regionName: string,
  ): Statement[] => {
    //#region @backendFunc
    const result: Statement[] = [];
    const stack: { insideTargetRegion: boolean; level: number }[] = [];
    let currentLevel = 0;

    for (const statement of statements) {
      const commentRanges =
        getLeadingCommentRanges(statement.getFullText(), 0) || [];
      const commentText = statement.getFullText();

      for (const range of commentRanges) {
        const comment = commentText.slice(range.pos, range.end).trim();

        // Detect start of a region
        const regionMatch = comment.match(/^\/\/#region (.*)/);
        if (regionMatch) {
          currentLevel++;
          const name = regionMatch[1].trim();

          // Push the current state of the stack
          stack.push({
            insideTargetRegion:
              stack.length > 0
                ? stack[stack.length - 1].insideTargetRegion
                : false,
            level: currentLevel,
          });

          // Check if this region matches the target
          if (name === regionName) {
            stack[stack.length - 1].insideTargetRegion = true;
          }

          continue;
        }

        // Detect end of a region
        if (comment.startsWith('//#endregion')) {
          if (
            stack.length > 0 &&
            stack[stack.length - 1].level === currentLevel
          ) {
            stack.pop();
          }
          currentLevel--;
          continue;
        }
      }

      // Check the top of the stack to see if we're inside the target region
      const insideTargetRegion =
        stack.length > 0 ? stack[stack.length - 1].insideTargetRegion : false;

      // Add statements that are not inside the target region
      if (!insideTargetRegion) {
        result.push(statement);
      }
    }

    return result;
    //#endregion
  };
  //#endregion

  //#region extract exports from a TypeScript file

  //#region helper function to check if a node is exported
  const isExported = (node: Node): boolean => {
    //#region @backendFunc
    return (
      (getCombinedModifierFlags(node as Declaration) & ModifierFlags.Export) !==
        0 || node.parent?.kind === SyntaxKind.SourceFile // For top-level exports
    );
    //#endregion
  };
  //#endregion

  //#region exports from file

  export interface ExportInfo {
    type:
      | 'class'
      | 'function'
      | 'const'
      | 'let'
      | 'var'
      | 'enum'
      | 'type'
      | 'interface'
      | 'default'
      | 'module'
      | 'namespace';
    name: string;
  }

  /**
   * Function to extract exports from a TypeScript file
   */
  export const exportsFromFile = (filePath: string): ExportInfo[] => {
    //#region @backendFunc
    if (!filePath.endsWith('.ts')) {
      return [];
    }
    const file = Helpers.readFile(filePath);
    return exportsFromContent(file);
    //#endregion
  };

  /**
   * Function to extract exports from a TypeScript file
   */
  export const exportsFromContent = (fileContent: string): ExportInfo[] => {
    //#region @backendFunc
    // Read the content of the file
    const sourceCode = fileContent;

    // Create a SourceFile object using the TypeScript API
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
    );

    // Array to hold the exports found
    const exports: {
      type:
        | 'class'
        | 'function'
        | 'const'
        | 'let'
        | 'var'
        | 'enum'
        | 'type'
        | 'interface'
        | 'default'
        | 'module'
        | 'namespace';
      name: string;
    }[] = [];

    //#region function to recursively check each node in the AST
    const checkNode = (node: Node) => {
      //#region @backendFunc
      // Determine the type and name of export based on node type
      if (isClassDeclaration(node) && node.name && isExported(node)) {
        exports.push({ type: 'class', name: node.name.text });
      } else if (isFunctionDeclaration(node) && node.name && isExported(node)) {
        exports.push({ type: 'function', name: node.name.text });
      } else if (isVariableStatement(node) && isExported(node)) {
        node.declarationList.declarations.forEach(declaration => {
          if (isIdentifier(declaration.name)) {
            exports.push({
              type:
                node.declarationList.flags & NodeFlags.Const
                  ? 'const'
                  : node.declarationList.flags & NodeFlags.Let
                    ? 'let'
                    : 'var',
              name: declaration.name.text,
            });
          }
        });
      } else if (isEnumDeclaration(node) && isExported(node)) {
        exports.push({ type: 'enum', name: node.name.text });
      } else if (isTypeAliasDeclaration(node) && isExported(node)) {
        exports.push({ type: 'type', name: node.name.text });
      } else if (isInterfaceDeclaration(node) && isExported(node)) {
        exports.push({ type: 'interface', name: node.name.text });
      } else if (isModuleDeclaration(node) && isExported(node)) {
        exports.push({ type: 'module', name: node.name.text });
      } else if (isExportAssignment(node)) {
        exports.push({ type: 'default', name: 'default' }); // `export default ...`
      }

      // Recursively check each child node
      forEachChild(node, checkNode);
      //#endregion
    };
    //#endregion

    // Start checking from the root node
    checkNode(sourceFile);

    return exports;
    //#endregion
  };
  //#endregion

  export type RedefinedExportInfo = {
    exportedName: string; // CustomColumn
    originalName: string; // Column
    from: string | null; // 'taon-typeorm/src'
    isStarExport: boolean; // export * from '...'
  };

  /**
   * Extracts redefined exports like:
   *   export { Column as CustomColumn } from 'x';
   *   export { Foo } from 'y';
   *   export * from 'z';
   */
  export const exportsRedefinedFromContent = (
    fileContent: string,
  ): RedefinedExportInfo[] => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      fileContent,
      ScriptTarget.Latest,
      true,
    );

    const exports: RedefinedExportInfo[] = [];

    const visit = (node: Node) => {
      //#region @backendFunc
      if (isExportDeclaration(node)) {
        const from =
          node.moduleSpecifier && isStringLiteral(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : null;

        // export * from 'x'
        if (!node.exportClause) {
          exports.push({
            exportedName: '*',
            originalName: '*',
            from,
            isStarExport: true,
          });
        }

        // export { A as B } from 'x'
        if (node.exportClause && isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            if (isExportSpecifier(element)) {
              const originalName = element.propertyName
                ? element.propertyName.text
                : element.name.text;

              const exportedName = element.name.text;

              exports.push({
                exportedName,
                originalName,
                from,
                isStarExport: false,
              });
            }
          }
        }
      }

      forEachChild(node, visit);
      //#endregion
    };

    visit(sourceFile);

    return exports;
    //#endregion
  };

  /**
   * Function to extract exports from a TypeScript file
   */
  export const exportsRedefinedFromFile = (
    filePath: string,
  ): RedefinedExportInfo[] => {
    //#region @backendFunc
    if (!filePath.endsWith('.ts')) {
      return [];
    }
    const file = Helpers.readFile(filePath);
    return exportsRedefinedFromContent(file);
    //#endregion
  };

  //#endregion

  //#region extract class names from ts file or source code

  export const extractDefaultClassNameFromString = (
    sourceCode: string,
  ): string | undefined => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    let defaultClassName = '';
    const checkNode = (node: Node) => {
      if (
        isClassDeclaration(node) &&
        node.modifiers?.find(m => m.kind === SyntaxKind.DefaultKeyword)
      ) {
        defaultClassName = node.name?.text || '';
      }
      forEachChild(node, checkNode);
    };
    checkNode(sourceFile);
    return defaultClassName;
    //#endregion
  };

  export const extractClassNameFromString = (sourceCode: string): string[] => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const classNames: string[] = [];
    const checkNode = (node: Node) => {
      if (isClassDeclaration(node)) {
        classNames.push(node.name?.text || '');
      }
      forEachChild(node, checkNode);
    };
    checkNode(sourceFile);
    return classNames;
    //#endregion
  };

  export const extractClassNamesFromFile = (
    absoluteFilePath: string,
  ): string[] => {
    //#region @backendFunc
    if (!absoluteFilePath.endsWith('.ts')) {
      return [];
    }
    const sourceCode = Helpers.readFile(absoluteFilePath);
    return extractClassNameFromString(sourceCode);
    //#endregion
  };

  export const extractDefaultClassNameFromFile = (absoluteFilePath: string) => {
    //#region @backendFunc
    const sourceCode = Helpers.readFile(absoluteFilePath);
    return extractDefaultClassNameFromString(sourceCode);
    //#endregion
  };
  //#endregion

  //#region format file(s) with prettier
  export const formatFile = (absPathToFile: string | string[]): void => {
    //#region @backendFunc
    absPathToFile = crossPlatformPath(absPathToFile);
    if (Helpers.exists(absPathToFile)) {
      const { execSync } = require('child_process');
      Helpers.logInfo(`Formatting file: ${absPathToFile}`);
      try {
        execSync(`prettier --write ${path.basename(absPathToFile)}`, {
          cwd: path.dirname(absPathToFile),
        });
      } catch (error) {
        console.warn(`Not able to format file: ${absPathToFile}`);
      }
      Helpers.taskDone(`Formatting file done.`);
    }
    //#endregion
  };

  export const formatAllFilesInsideFolder = (absPathToFolder: string): void => {
    //#region @backendFunc
    if (Helpers.exists(absPathToFolder)) {
      if (!Helpers.isFolder(absPathToFolder)) {
        Helpers.error(`"${absPathToFolder}" is not a folder`);
      }
      const { execSync } = require('child_process');
      try {
        execSync(`prettier --write .`, { cwd: absPathToFolder });
      } catch (error) {
        console.warn(`Not able to prettier all files in: ${absPathToFolder}`);
      }
    }
    //#endregion
  };
  //#endregion

  //#region lint file(s) with eslint
  export const eslintFixFile = (absPathToFile: string | string[]): void => {
    //#region @backendFunc
    absPathToFile = crossPlatformPath(absPathToFile);
    if (Helpers.exists(absPathToFile)) {
      Helpers.logInfo(`Fixing file with eslint: ${absPathToFile}`);

      try {
        // use local eslint first
        child_process.execSync(
          `npx --yes eslint --fix ${path.basename(absPathToFile as string)}`,
          {
            cwd: path.dirname(absPathToFile as string),
            stdio: 'inherit',
          },
        );
      } catch (error) {}

      Helpers.taskDone(`Eslint file fix done.`);
    }
    //#endregion
  };

  export const eslintFixAllFilesInsideFolderAsync = async (
    absPathToFolder: string | string[],
  ): Promise<void> => {
    //#region @backendFunc
    absPathToFolder = crossPlatformPath(absPathToFolder);

    if (!Helpers.exists(absPathToFolder)) {
      return;
    }

    Helpers.info(`Fixing files with eslint in: ${absPathToFolder}`);

    const runEslintFix = (): Promise<void> =>
      new Promise((resolve, reject) => {
        const child = spawn('npx', ['--yes', 'eslint', '--fix', '.'], {
          cwd: absPathToFolder,
          windowsHide: true, // 🔥 prevents black terminal on Windows
          shell: false,
          stdio: 'inherit',
        });

        child.once('error', reject);

        child.once('close', code => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`eslint exited with code ${code}`));
          }
        });
      });

    // sequential, real await
    try {
      await runEslintFix();
      await runEslintFix();
    } catch (error) {}

    Helpers.info(`Eslint fixing files done.`);
    //#endregion
  };

  /**
   * @deprecated use eslintFixAllFilesInsideFolderAsync
   */
  export const eslintFixAllFilesInsideFolder = (
    absPathToFolder: string | string[],
  ): void => {
    //#region @backendFunc
    absPathToFolder = crossPlatformPath(absPathToFolder);
    if (Helpers.exists(absPathToFolder)) {
      Helpers.info(`Fixing files with eslint in: ${absPathToFolder}`);
      const lintFixFn = () => {
        try {
          child_process.execSync(`npx --yes eslint --fix . `, {
            cwd: absPathToFolder,
            stdio: 'inherit',
          });
        } catch (error) {}
      };
      lintFixFn(); // TODO QUICK_FIX
      lintFixFn(); // sometimes it needs to be run twice
      Helpers.info(`Eslint fixing files done.`);
    }
    //#endregion
  };
  //#endregion

  //#region extract Taon contexts from file
  export const getTaonContextFromContent = (fileContent: string): string[] => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'tempFile.ts',
      fileContent,
      ScriptTarget.Latest,
      true,
    );

    const contextNames: string[] = [];

    // Recursive function to walk through the AST
    const visitNode = (node: any) => {
      try {
        if (
          isVariableDeclaration(node) &&
          node.initializer &&
          isCallExpression(node.initializer)
        ) {
          let functionName = '';
          let objectName = '';

          if (isPropertyAccessExpression(node.initializer.expression)) {
            functionName = node.initializer.expression.name?.text || '';
            objectName =
              node.initializer.expression.expression?.getText() || '';
          } else if (isIdentifier(node.initializer.expression)) {
            functionName = node.initializer.expression.text;
          }

          if (
            functionName === 'createContext' &&
            (objectName === 'Taon' || objectName === '')
          ) {
            if (node.name && isIdentifier(node.name)) {
              contextNames.push(node.name.text);
            }
          }
        }

        forEachChild(node, visitNode);
      } catch (error) {
        console.error('Error processing node:', error);
      }
    };

    try {
      forEachChild(sourceFile, visitNode);
    } catch (error) {
      console.error('Error traversing AST:', error);
    }

    return contextNames;
    //#endregion
  };

  export const getTaonContextsNamesFromFile = (
    tsAbsFilePath: string,
  ): string[] => {
    //#region @backendFunc
    return getTaonContextFromContent(Helpers.readFile(tsAbsFilePath));
    //#endregion
  };

  //#endregion

  //#region extract selectors from Angular components class files
  export const extractAngularComponentSelectors = (
    fileAbsPath: string,
  ): { className: string; selector: string }[] => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      fileAbsPath,
      Helpers.readFile(fileAbsPath),
      ScriptTarget.Latest,
      true,
    );

    const selectors: { className: string; selector: string }[] = [];

    const visit = (node: any) => {
      if (isClassDeclaration(node) && node.name) {
        const decorators = canHaveDecorators(node)
          ? getDecorators(node)
          : undefined;
        if (decorators) {
          for (const decorator of decorators) {
            if (
              isCallExpression(decorator.expression) &&
              isIdentifier(decorator.expression.expression) &&
              decorator.expression.expression.text === 'Component'
            ) {
              const args = decorator.expression.arguments;
              if (args.length > 0 && isObjectLiteralExpression(args[0])) {
                for (const property of args[0].properties) {
                  if (
                    isPropertyAssignment(property) &&
                    isIdentifier(property.name) &&
                    property.name.text === 'selector' &&
                    isStringLiteral(property.initializer)
                  ) {
                    selectors.push({
                      className: node.name.text,
                      selector: property.initializer.text,
                    });
                  }
                }
              }
            }
          }
        }
      }
      forEachChild(node, visit);
    };

    visit(sourceFile);
    return selectors;
    //#endregion
  };
  //#endregion

  //#region wrap one line with comment
  export const wrapWithComment = (
    oneLineComment: string,
    absDestFilePath: string,
  ) => {
    //#region @backendFunc
    const ext = path.extname(absDestFilePath).toLowerCase();
    let commentSyntax;

    switch (ext) {
      case '.ts':
      case '.js':
      case '.jsonc':
      case '.sh':
        commentSyntax = `// ${oneLineComment}`;
        break;
      case '.html':
        commentSyntax = `<!-- ${oneLineComment} -->`;
        break;
      case '.css':
      case '.scss':
      case '.sass':
        commentSyntax = `/* ${oneLineComment} */`;
        break;
      default:
        console.warn(`Unknown file extension: ${ext}`);
        commentSyntax = oneLineComment;
    }
    return commentSyntax;
    //#endregion
  };
  //#endregion

  //#region ser or add exported variable with AST
  // Helper to check if a node has 'export' in its modifiers
  // const hasExportModifier = (
  //   modifiers: ts.NodeArray<ts.Modifier> | undefined,
  // ) => {
  //   return (
  //     !!modifiers && modifiers.some(m => m.kind === SyntaxKind.ExportKeyword)
  //   );
  // };

  /**
   * Attempts to set or add an exported const with given name and value.
   */
  export const setValueToVariableInTsFile = (
    tsAbsFilePath: string,
    variableName: string,
    valueOfVariable: any,
    options?: {
      skipAddIfNotExists?: boolean;
      useRawStringValue?: boolean;
    },
  ): void => {
    //#region @backendFunc
    const sourceText = Helpers.readFile(tsAbsFilePath);
    const sourceFile = createSourceFile(
      tsAbsFilePath,
      sourceText,
      ScriptTarget.Latest,
      /*setParentNodes */ true,
    );
    options = options || {};
    const addIfNotExists = !options.skipAddIfNotExists;

    // We'll build an AST transformer that modifies or inserts our variable declaration
    const transformer = (context: TransformationContext) => {
      const { factory } = context;

      return (rootNode: SourceFile) => {
        let variableFound = false;

        const visit = (node: ts.Node): ts.Node => {
          // Check for "export const <variableName> = ...;"
          if (
            isVariableStatement(node)
            // && hasExportModifier(node.modifiers as any)
          ) {
            const declList = node.declarationList;
            const newDeclarations = declList.declarations.map(decl => {
              if (isIdentifier(decl.name) && decl.name.text === variableName) {
                variableFound = true;

                // Create a new initializer. If valueOfVariable is a string,
                // we wrap it with quotes; otherwise, create a numeric or object literal.
                let initializer: ts.Expression;
                if (typeof valueOfVariable === 'string') {
                  if (options.useRawStringValue) {
                    initializer = factory.createIdentifier(valueOfVariable);
                  } else {
                    initializer = factory.createStringLiteral(valueOfVariable);
                  }
                } else if (typeof valueOfVariable === 'number') {
                  initializer = factory.createNumericLiteral(valueOfVariable);
                } else {
                  // Fallback: wrap JSON string => parse with TS
                  // Or you can create a more sophisticated approach for arrays/objects
                  if (valueOfVariable === undefined) {
                    console.warn(`[${config.frameworkName}-helpers][setValueToVariableInTsFile]

                      SETTING VALUE OF VARIABLE TO UNDEFINED "${variableName}"

                      `);
                    initializer = factory.createIdentifier('undefined');
                  } else {
                    initializer = factory.createIdentifier(
                      JSON.stringify(valueOfVariable),
                    );
                  }
                }

                // Return a new variable declaration with the updated initializer
                return factory.updateVariableDeclaration(
                  decl,
                  decl.name,
                  decl.exclamationToken,
                  decl.type,
                  initializer,
                );
              }
              return decl;
            });

            // Return a new VariableStatement if we changed anything
            return factory.updateVariableStatement(
              node,
              node.modifiers,
              factory.updateVariableDeclarationList(declList, newDeclarations),
            );
          }

          return visitEachChild(node, visit, context);
        };

        let updatedRoot = visitNode(rootNode, visit) as any;

        // If variable not found and addIfNotExists === true, add a new export statement
        if (!variableFound && addIfNotExists) {
          // Create something like: export const <variableName> = <valueOfVariable>;
          let initializer: ts.Expression;
          if (typeof valueOfVariable === 'string') {
            initializer = factory.createStringLiteral(valueOfVariable);
          } else if (typeof valueOfVariable === 'number') {
            initializer = factory.createNumericLiteral(valueOfVariable);
          } else {
            initializer = factory.createIdentifier(
              JSON.stringify(valueOfVariable),
            );
          }

          const newVarStatement = factory.createVariableStatement(
            [factory.createModifier(SyntaxKind.ExportKeyword)],
            factory.createVariableDeclarationList(
              [
                factory.createVariableDeclaration(
                  factory.createIdentifier(variableName),
                  /* exclamationToken */ undefined,
                  /* type */ undefined,
                  initializer,
                ),
              ],
              NodeFlags.Const,
            ),
          );

          // Append it to the end of the file
          const newStatements = [...updatedRoot.statements, newVarStatement];
          updatedRoot = factory.updateSourceFile(updatedRoot, newStatements);
        }

        return updatedRoot;
      };
    };

    // Apply the transformer
    const result = transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0] as ts.SourceFile;

    // Print the new AST back to text
    const printer = createPrinter();
    const newContent = printer.printFile(transformedSourceFile);

    // Overwrite the file
    Helpers.writeFile(tsAbsFilePath, newContent);
    result.dispose();
    //#endregion
  };

  //#endregion

  //#region recognize imports from file

  //#region recognize imports from file / ts import export class
  export class TsImportExport {
    /**
     * for external modification
     */
    embeddedPathToFileResult: string;

    /**
     * for external modification
     */
    packageName: string;

    /**
     * for external modification
     */
    isIsomorphic?: boolean;

    //#region generated/readonly files
    readonly type: 'export' | 'import' | 'async-import' | 'require';

    /**
     * ORIGNAL
     * Name of the file that is being imported/exported
     * with parenthesis included , example
     * 'my-file' or "my-file" or `my-file`
     */
    readonly embeddedPathToFile: string;

    /**
     * same as cleanEmbeddedPathToFile but without quotes (parenthesis), example:
     * my-file or my-file or my-file
     */
    readonly cleanEmbeddedPathToFile: string;

    readonly startRow: number;

    readonly startCol: number;

    readonly endRow: number;

    readonly endCol: number;

    readonly parenthesisType: 'single' | 'double' | 'tics';

    readonly importElements: string[] = [];
    //#endregion

    //#region constructor
    constructor(
      type: 'export' | 'import' | 'async-import' | 'require',
      embeddedPathToFile: string,
      start: ts.LineAndCharacter,
      end: ts.LineAndCharacter,
      parenthesisType: 'single' | 'double' | 'tics',
      importElements: string[] = [],
    ) {
      this.type = type;
      this.isIsomorphic = false;
      this.embeddedPathToFile = embeddedPathToFile;
      this.cleanEmbeddedPathToFile =
        this.removeStartEndQuotes(embeddedPathToFile);
      this.embeddedPathToFileResult = embeddedPathToFile;
      this.startRow = start.line + 1; // TypeScript lines are zero-based
      this.startCol = start.character + 1;
      this.endRow = end.line + 1;
      this.endCol = end.character + 1;
      this.parenthesisType = parenthesisType;
      this.importElements = importElements;
    }
    //#endregion

    //#region remove quotes
    private removeStartEndQuotes(str: string): string {
      return str.replace(/^['"`]/, '').replace(/['"`]$/, '');
    }
    //#endregion

    //#region get string part
    /**
     * it will extract part of the file content
     * that is between startRow, startCol and endRow, endCol
     * and contains import/export/require statement
     */
    public getStringPartFrom(wholeContentOfFile: string): string {
      const lines = wholeContentOfFile.split('\n');

      // Convert 1-based row indices to 0-based
      const startRowIndex = this.startRow - 1;
      const endRowIndex = this.endRow - 1;

      // Ensure indices are within bounds
      if (startRowIndex >= lines.length || endRowIndex >= lines.length) {
        throw new Error('Row index out of bounds.');
      }

      let extractedLines: string[] = [];

      for (let i = startRowIndex; i <= endRowIndex; i++) {
        let line = lines[i];

        if (i === startRowIndex && i === endRowIndex) {
          // Same row: extract from startCol to endCol
          extractedLines.push(line.substring(this.startCol - 1, this.endCol));
        } else if (i === startRowIndex) {
          // First row: extract from startCol to end
          extractedLines.push(line.substring(this.startCol - 1));
        } else if (i === endRowIndex) {
          // Last row: extract from beginning to endCol
          extractedLines.push(line.substring(0, this.endCol));
        } else {
          // Whole row in between
          extractedLines.push(line);
        }
      }

      return extractedLines.join('\n');
    }
    //#endregion

    //#region wrap in current parenthesis
    public wrapInParenthesis(str: string): string {
      return this.parenthesisType === 'single'
        ? `'${str}'`
        : this.parenthesisType === 'double'
          ? `"${str}"`
          : `\`${str}\``;
      //#endregion
    }
  }
  //#endregion

  //#region recognize imports from file / get quote type
  const getQuoteType = (text: string): 'single' | 'double' | 'tics' => {
    //#region @websqlFunc
    if (text.startsWith('`')) return 'tics';
    if (text.startsWith("'")) return 'single';
    return 'double';
    //#endregion
  };
  //#endregion

  //#region recognize imports from file / extract import export elements
  const extractImportExportElements = (node: ts.Node): string[] => {
    //#region @websqlFunc
    const elements: string[] = [];

    if (isImportDeclaration(node) && node.importClause) {
      // Check if there are named imports inside { }
      if (
        node.importClause.namedBindings &&
        isNamedImports(node.importClause.namedBindings)
      ) {
        elements.push(
          ...node.importClause.namedBindings.elements.map(el => el.name.text),
        );
      }
    } else if (isExportDeclaration(node) && node.exportClause) {
      // Check if there are named exports inside { }
      if (isNamedExports(node.exportClause)) {
        elements.push(...node.exportClause.elements.map(el => el.name.text));
      }
    }

    return elements;
    //#endregion
  };
  //#endregion

  //#region recognize imports from file / recognize imports from file
  export const recognizeImportsFromFile = (
    fileAbsPAth: string,
  ): TsImportExport[] => {
    //#region @backendFunc
    const content = Helpers.readFile(fileAbsPAth);
    return recognizeImportsFromContent(content);
    //#endregion
  };
  //#endregion

  //#region recognize imports from file / recognize imports from content
  export const recognizeImportsFromContent = (
    fileContent: string,
  ): TsImportExport[] => {
    if (!fileContent) {
      return [];
    }

    const sourceFile = createSourceFile(
      'file.ts', // a name for the file
      fileContent,
      ScriptTarget.Latest,
      true,
    );

    const results: TsImportExport[] = [];

    const visit = (node: Node) => {
      // Check for dynamic import expressions specifically
      if (
        isCallExpression(node) &&
        node.expression.kind === SyntaxKind.ImportKeyword
      ) {
        const args = node.arguments;
        if (args.length) {
          const arg = args[0];
          const specifier = arg.getText(sourceFile);
          const parenthesisType = getQuoteType(specifier);
          results.push(
            new TsImportExport(
              'async-import',
              specifier,
              sourceFile.getLineAndCharacterOfPosition(node.getStart()),
              sourceFile.getLineAndCharacterOfPosition(node.getEnd()),
              parenthesisType,
            ),
          );
        }
      }

      if (isImportDeclaration(node) || isExportDeclaration(node)) {
        const specifier = node.moduleSpecifier
          ? (node.moduleSpecifier as Expression).getText(sourceFile)
          : '';
        const parenthesisType = getQuoteType(specifier);
        const type =
          node.kind === SyntaxKind.ImportDeclaration ? 'import' : 'export';
        const importExportElements = extractImportExportElements(node);
        results.push(
          new TsImportExport(
            type,
            specifier,
            sourceFile.getLineAndCharacterOfPosition(node.getStart()),
            sourceFile.getLineAndCharacterOfPosition(node.getEnd()),
            parenthesisType,
            importExportElements,
          ),
        );
      }

      if (
        isCallExpression(node) &&
        node.expression.getText(sourceFile) === 'require'
      ) {
        const args = node.arguments;
        if (args.length > 0) {
          const arg = args[0];
          const specifier = arg.getText(sourceFile);
          const parenthesisType = getQuoteType(specifier);
          results.push(
            new TsImportExport(
              'require',
              specifier,
              sourceFile.getLineAndCharacterOfPosition(arg.getStart()),
              sourceFile.getLineAndCharacterOfPosition(arg.getEnd()),
              parenthesisType,
            ),
          );
        }
      }

      forEachChild(node, visit);
    };

    forEachChild(sourceFile, visit);

    return results;
  };
  //#endregion

  //#endregion

  //#region extract renamed imports or exports
  export type RenamedImportOrExport = {
    elementName: string; // original/imported/exported-from name
    renamedAs: string; // local/exported-as name
    packageName?: string; // module specifier text without quotes (if any)
  };

  export const extractRenamedImportsOrExport = (
    content: string,
  ): RenamedImportOrExport[] => {
    //#region @backendFunc
    if (!content?.trim()) return [];

    const sf = createSourceFile(
      'file.ts',
      content,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const out: RenamedImportOrExport[] = [];

    const pushIfRenamed = (
      elementName: string,
      renamedAs: string,
      packageName?: string,
    ) => {
      if (!elementName || !renamedAs) return;
      if (elementName === renamedAs) return; // only renamed ones
      out.push({ elementName, renamedAs, packageName });
    };

    const visit = (node: ts.Node): void => {
      // import { A as B } from 'pkg'
      if (isImportDeclaration(node)) {
        const pkg =
          node.moduleSpecifier && isStringLiteral(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : undefined;

        const clause = node.importClause;
        const named = clause?.namedBindings;
        if (named && isNamedImports(named)) {
          for (const el of named.elements) {
            if (!el.propertyName) continue; // not renamed
            pushIfRenamed(el.propertyName.text, el.name.text, pkg);
          }
        }
      }

      // export { A as B } [from 'pkg']
      if (isExportDeclaration(node)) {
        const pkg =
          node.moduleSpecifier && isStringLiteral(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : undefined;

        const clause = node.exportClause;
        if (clause && isNamedExports(clause)) {
          for (const el of clause.elements) {
            if (!el.propertyName) continue; // not renamed
            pushIfRenamed(el.propertyName.text, el.name.text, pkg);
          }
        }
      }

      forEachChild(node, visit);
    };

    visit(sf);
    return out;
    //#endregion
  };

  //#endregion

  //#region transform Angular component standalone option
  /**
   * Transition methods ng18 => ng19
   * Adds standalone: false if not exists in component decorator
   */
  export function transformComponentStandaloneOption(
    sourceText: string,
  ): string {
    //#region @backendFunc
    return sourceText.replace(
      /@Component\s*\(\s*\{([\s\S]*?)\}\s*\)/g,
      (full, propsBlock) => {
        let props = propsBlock;

        // 1. Remove standalone: true
        // props = props.replace(/\s*standalone\s*:\s*true\s*,?/g, '');

        // 2. Check if standalone exists after removal
        const hasStandalone = /standalone\s*:/.test(props);

        // 3. Insert standalone: false if missing
        if (hasStandalone) {
          // do nothing
        } else {
          const hasImports = /imports\s*:/.test(props);
          if (!hasImports) {
            // If block is empty or only whitespace
            if (/^\s*$/.test(props)) {
              props = `\n  standalone: false\n`;
            } else {
              props += `\n  standalone: false`;
            }
          }
        }

        return `@Component({${props}})`;
      },
    );
    //#endregion
  }
  //#endregion

  //#region escape @ in html text
  const escapeAtInHtmlText = (fileContent: string): string => {
    return fileContent.replace(
      />([^<@]*?)@([^<]*)</g,
      (_match, before, after) => {
        return `>${before}&#64;${after}<`;
      },
    );
  };

  export const fixHtmlTemplatesInDir = (directoryPath: string): void => {
    //#region @backendFunc
    Helpers.taskStarted(`(before prettier) Fixing HTML templates in`);
    const files = Helpers.filesFrom(directoryPath, true, false);

    for (const fullPath of files) {
      const file = path.basename(fullPath);
      if (Helpers.exists(fullPath)) {
        const stat = fse.statSync(fullPath);

        if (file.endsWith('.html')) {
          const original = Helpers.readFile(fullPath);
          const fixed = escapeAtInHtmlText(original);
          if (fixed !== original) {
            Helpers.writeFile(fullPath, fixed);
            console.log(`Html fixed @ -> &#64: ${fullPath}`);
          }
        }
      }
    }
    Helpers.taskDone(`(before prettier) Fixing HTML templates done.`);
    //#endregion
  };
  //#endregion

  //#region remove tagged imports/exports
  export function removeTaggedImportExport(
    tsFileContent: string,
    tags: string[],
    replaceWithEmptyLine: boolean = false,
    // debug = false,
  ): string {
    const sourceFile = createSourceFile(
      'temp.ts',
      tsFileContent,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const lines = tsFileContent.split(/\r?\n/);
    const tagRegex = new RegExp(
      tags
        .map(t => (Array.isArray(t) ? t[0] : t))
        .filter(Boolean)
        .map(t => Utils.escapeStringForRegEx(t))
        .join('|'),
      'i',
    );

    let a = 0;
    for (const statement of sourceFile.statements) {
      // debug && console.log('processing line ' + a++);
      if (!isImportDeclaration(statement) && !isExportDeclaration(statement)) {
        continue;
      }

      const start = statement.getStart();
      const end = statement.getEnd();

      const startLine = sourceFile.getLineAndCharacterOfPosition(start).line;
      const endLine = sourceFile.getLineAndCharacterOfPosition(end).line;

      // get full text including trailing comments
      const endLineText = lines[endLine]; // ← get real line content from file

      if (!tagRegex.test(endLineText)) continue;

      for (let i = startLine; i <= endLine; i++) {
        const original = lines[i];
        if (replaceWithEmptyLine) {
          lines[i] = '';
        } else {
          lines[i] = '/* */' + ' '.repeat(Math.max(0, original.length - 4));
        }
      }
    }

    const result = lines.join('\n');
    return result;
  }
  //#endregion

  //#region remove tagged array objects
  export function removeTaggedArrayObjects(
    tsFileContent: string,
    tags: string[],
    replaceWithEmptyLine: boolean = false,
  ): string {
    const sourceFile = createSourceFile(
      'temp.ts',
      tsFileContent,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const lines = tsFileContent.split(/\r?\n/);

    const tagRegex = new RegExp(
      tags.map(t => Utils.escapeStringForRegEx(t)).join('|'),
      'i',
    );

    function hasTag(node: ts.Node): boolean {
      const fullText = sourceFile.getFullText();

      // comments BEFORE object
      const leading =
        getLeadingCommentRanges(fullText, node.getFullStart()) ?? [];
      for (const c of leading) {
        const text = fullText.slice(c.pos, c.end);
        if (tagRegex.test(text)) return true;
      }

      // comments AFTER `{` (same-line)
      const trailing =
        getTrailingCommentRanges(fullText, node.getStart()) ?? [];
      for (const c of trailing) {
        const text = fullText.slice(c.pos, c.end);
        if (tagRegex.test(text)) return true;
      }

      return false;
    }

    function commentOutNode(node: ts.Node) {
      const startLine = sourceFile.getLineAndCharacterOfPosition(
        node.getStart(),
      ).line;
      const endLine = sourceFile.getLineAndCharacterOfPosition(
        node.getEnd(),
      ).line;

      for (let i = startLine; i <= endLine; i++) {
        const original = lines[i];
        if (replaceWithEmptyLine) {
          lines[i] = '';
        } else {
          lines[i] = '/* */' + ' '.repeat(Math.max(0, original.length - 4));
        }
      }
    }

    function visit(node: ts.Node) {
      if (isArrayLiteralExpression(node)) {
        for (const element of node.elements) {
          if (isObjectLiteralExpression(element) && hasTag(element)) {
            commentOutNode(element);
          }
        }
      }

      forEachChild(node, visit);
    }

    visit(sourceFile);

    return lines.join('\n');
  }
  //#endregion

  //#region remove tagged lines
  export function removeTaggedLines(
    tsFileContent: string,
    tags: string[],
    replaceWithEmptyLine: boolean = false,
  ): string {
    const lines = tsFileContent.split(/\r?\n/);

    const tagRegex = new RegExp(
      tags
        .filter(Boolean)
        .map(t => Utils.escapeStringForRegEx(t))
        .join('|'),
      'i',
    );

    for (let i = 0; i < lines.length; i++) {
      const original = lines[i];

      if (!tagRegex.test(original)) continue;

      // preserve line length
      if (replaceWithEmptyLine) {
        lines[i] = '';
      } else {
        lines[i] = '/* */' + ' '.repeat(Math.max(0, original.length - 4));
      }
    }

    return lines.join('\n');
  }
  //#endregion

  //#region add content below placeholder
  export function addBelowPlaceholder(
    tsFileContent: string,
    placeholderTag: string,
    contentToAdd: string,
  ): string {
    const lines = tsFileContent.split(/\r?\n/);
    const insertLines = contentToAdd.split(/\r?\n/);

    const placeholderRegex = new RegExp(
      Utils.escapeStringForRegEx(placeholderTag),
      'i',
    );

    for (let i = 0; i < lines.length; i++) {
      if (!placeholderRegex.test(lines[i])) continue;

      // insert directly BELOW the placeholder line
      lines.splice(i + 1, 0, ...insertLines);
      break;
    }

    return lines.join('\n');
  }
  //#endregion

  //#region wrap first imports in region
  export const wrapFirstImportsInImportsRegion = (
    fileContent: string,
  ): string => {
    //#region @backendFunc
    const importRegion = `//#re` + `gion`;
    const importRegionStart = `${importRegion} imports`;
    const importRegionEnd = `//#end` + `region`;

    if (fileContent.startsWith(importRegionStart)) {
      return fileContent; // already wrapped
    }

    let firstRegionLine: string | undefined = undefined;
    if (fileContent.startsWith(importRegion)) {
      const lines = fileContent.split(/\r?\n/);

      if (lines[0].includes('@notF' + 'orNpm')) {
        firstRegionLine = lines[0];
        fileContent = lines.slice(1).join('\n');
      }
    }

    const sourceFile = createSourceFile(
      'temp.ts',
      fileContent,
      ScriptTarget.Latest,
      true,
    );
    const lines = fileContent.split(/\r?\n/);

    const importDeclarations: ts.ImportDeclaration[] = [];

    for (const statement of sourceFile.statements) {
      if (isImportDeclaration(statement)) {
        importDeclarations.push(statement);
      } else if (
        isEmptyStatement(statement) ||
        (isExpressionStatement(statement) &&
          statement.getFullText(sourceFile).trim() === '')
      ) {
        // skip empty lines or empty statements
        continue;
      } else {
        break; // stop at first non-import statement
      }
    }

    if (importDeclarations.length === 0) {
      return fileContent + (firstRegionLine ? `\n${firstRegionLine}` : ''); // nothing to wrap
    }

    const firstImportStart = importDeclarations[0].getFullStart();
    const lastImportEnd =
      importDeclarations[importDeclarations.length - 1].getEnd();

    // Get the line numbers (1-based)
    const startLine =
      sourceFile.getLineAndCharacterOfPosition(firstImportStart).line;
    const endLine =
      sourceFile.getLineAndCharacterOfPosition(lastImportEnd).line;

    const before = lines.slice(0, startLine);
    const importBlock = lines.slice(startLine, endLine + 1);
    const after = lines.slice(endLine + 1);

    return [
      ...before,
      firstRegionLine,
      importRegionStart,
      ...importBlock,
      importRegionEnd,
      ...after,
    ]
      .filter(f => f !== undefined)
      .join('\n');
    //#endregion
  };
  //#endregion

  //#region wrap entities class fields with region
  const applyEdits = (
    original: string,
    edits: { pos: number; text: string }[],
  ): string => {
    edits.sort((a, b) => b.pos - a.pos); // apply from end to start
    let result = original;
    for (const edit of edits) {
      result = result.slice(0, edit.pos) + edit.text + result.slice(edit.pos);
    }
    return result;
  };

  /**
   * wrap class field with decorators
   * wrap class methods with decorators
   */
  export function wrapContentClassMembersDecoratorsWithRegion(
    classFileContent: string,
    wrapTag = '@websql',
  ): string {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      classFileContent,
      ScriptTarget.Latest,
      true,
    );

    const edits: { pos: number; text: string }[] = [];

    const isAlreadyWrapped = (decorator: ts.Decorator): boolean => {
      const text = decorator.getFullText(sourceFile);
      return (
        text.includes(`//#reg` + `ion ${wrapTag}`) ||
        text.includes(`//#end` + `reg` + `ion`)
      );
    };

    const visit = (node: ts.Node) => {
      if (isClassDeclaration(node)) {
        for (const member of node.members) {
          if (!isPropertyDeclaration(member) && !isMethodDeclaration(member))
            continue;

          const decorators = canHaveDecorators(member)
            ? getDecorators(member)
            : undefined;

          if (!decorators || decorators.length === 0) continue;

          for (const decorator of decorators) {
            if (isAlreadyWrapped(decorator)) continue;

            const start = decorator.getStart();
            const end = decorator.getEnd();

            edits.push({ pos: start, text: `\n//#reg` + `ion ${wrapTag}\n` });
            edits.push({ pos: end, text: `\n//#end` + `reg` + `ion` }); // No extra newline
          }
        }
      }

      forEachChild(node, visit);
    };

    visit(sourceFile);
    return applyEdits(classFileContent, edits);
    //#endregion
  }
  //#endregion

  //#region transform flat imports
  export type FlattenMapping = {
    [modulePath: string]: {
      [oldQualifiedName: string]: string; // new identifier
    };
  };

  const buildQualifiedRegex = (qualifiedName: string): RegExp => {
    const parts = qualifiedName.split('.');

    const escapedParts = parts.map(p =>
      p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
    );

    const pattern = '\\b' + escapedParts.join('\\s*\\.\\s*') + '\\b';

    return new RegExp(pattern, 'g');
  };

  export function transformFlatImports(
    sourceText: string,
    mapping: FlattenMapping,
  ): string {
    //#region @backendFunc
    let transformed = sourceText;

    const importsToAdd = new Map<string, Set<string>>();

    // 1. Replace qualified usages
    for (const [modulePath, entries] of Object.entries(mapping)) {
      for (const [oldName, newName] of Object.entries(entries)) {
        const usageRegex = buildQualifiedRegex(oldName);

        if (usageRegex.test(transformed)) {
          transformed = transformed.replace(usageRegex, newName);

          if (!importsToAdd.has(modulePath)) {
            importsToAdd.set(modulePath, new Set());
          }
          importsToAdd.get(modulePath)!.add(newName);
        }
      }
    }

    // 2. Parse existing imports
    const existingImports = new Map<string, Set<string>>();

    const importRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]([^'"]+)['"]/g;

    for (const match of transformed.matchAll(importRegex)) {
      const [, imports, modulePath] = match;
      const names = imports.split(',').map(s => s.trim());
      existingImports.set(modulePath, new Set(names));
    }

    // 3. Build missing import statements
    const newImportLines: string[] = [];

    for (const [modulePath, names] of importsToAdd) {
      const alreadyImported = existingImports.get(modulePath) ?? new Set();

      const missing = [...names].filter(n => !alreadyImported.has(n));
      if (missing.length === 0) continue;

      newImportLines.push(
        `import { ${missing.join(', ')} } from '${modulePath}';`,
      );
    }

    // 4. Inject imports (after last import or at top)
    if (newImportLines.length > 0) {
      const lastImportMatch = [
        ...transformed.matchAll(/import .*?;\n?/g),
      ].pop();

      if (lastImportMatch?.index != null) {
        const insertPos = lastImportMatch.index + lastImportMatch[0].length;

        transformed =
          transformed.slice(0, insertPos) +
          '\n' +
          newImportLines.join('\n') +
          '\n' +
          transformed.slice(insertPos);
      } else {
        transformed = newImportLines.join('\n') + '\n\n' + transformed;
      }
    }

    return transformed;
    //#endregion
  }
  //#endregion

  //#region clear require cache recursive
  export const clearRequireCacheRecursive = (
    modulePath: string,
    seen = new Set<string>(),
  ): void => {
    //#region @backendFunc
    const resolvedPath = require.resolve(modulePath);
    const mod = require.cache[resolvedPath];

    if (!mod || seen.has(resolvedPath)) return;

    seen.add(resolvedPath);

    // Recursively clear children
    for (const child of mod.children) {
      clearRequireCacheRecursive(child.id, seen);
    }

    delete require.cache[resolvedPath];
    //#endregion
  };
  //#endregion

  //#region deep writable interface
  /**
   * Make all properties of T and its nested objects writable (non-readonly).
   */
  export type DeepWritable<T> = {
    -readonly [P in keyof T]: T[P] extends object
      ? T[P] extends Function
        ? T[P]
        : DeepWritable<T[P]>
      : T[P];
  };
  //#endregion

  //#region add or update import if not exists
  export const addOrUpdateImportIfNotExists = (
    tsFileContent: string,
    identifiers: string | string[],
    fromModule: string,
  ): string => {
    const idents = Array.isArray(identifiers) ? identifiers : [identifiers];

    const impRegex = new RegExp(
      `${'imp' + 'ort'}\\s*\\{([^}]*)\\}\\s*from\\s*['"]${fromModule}['"];?`,
      'm',
    );

    const match = tsFileContent.match(impRegex);

    // ----------------------------------------------------
    // 1. Import exists → merge identifiers
    // ----------------------------------------------------
    if (match) {
      const existing = match[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const merged = Array.from(new Set([...existing, ...idents])).sort();

      const updatedImport = `import { ${merged.join(
        ', ',
      )} } from '${fromModule}';`;

      return tsFileContent.replace(match[0], updatedImport);
    }

    // ----------------------------------------------------
    // 2. Import does NOT exist → insert into //#region imports
    // ----------------------------------------------------
    const newImport = `${'imp' + 'ort'} { ${idents.join(', ')} } from '${fromModule}';\n`;

    const regRegex = new RegExp(
      `\\/\\/\\#${'reg' + 'ion'} imports\\s*\\n([\\s\\S]*?)\\/\\/\\#${'endr' + 'egion'}`,
      'm',
    );

    const regionMatch = tsFileContent.match(regRegex);

    if (regionMatch) {
      const regStart = regionMatch.index! + regionMatch[0].indexOf('\n') + 1;

      return (
        tsFileContent.slice(0, regStart) +
        newImport +
        tsFileContent.slice(regStart)
      );
    }

    // ----------------------------------------------------
    // 3. Fallback → insert at very top (after 'use strict')
    // ----------------------------------------------------
    const useStrictMatch = tsFileContent.match(/^(['"])use strict\1;\s*/m);

    if (useStrictMatch) {
      const idx = useStrictMatch.index! + useStrictMatch[0].length;

      return tsFileContent.slice(0, idx) + newImport + tsFileContent.slice(idx);
    }

    return newImport + tsFileContent;
  };
  //#endregion

  //#region migrate from ng modules to standalone v21
  export const migrateFromNgModulesToStandaloneV21 = (
    tsFileContent: string,
    projectName: string,
  ): string => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'app.ts',
      tsFileContent,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    let text = tsFileContent;

    const appClassOld = `${projectName}Component`;
    const appClassNew = `${projectName}App`;
    const startFnOld = `start`;
    const startFnNew = `${projectName}StartFunction`;
    const routesOld = `routes`;
    const routesNew = `${projectName}ClientRoutes`;

    let ngModuleNode: ts.ClassDeclaration | undefined;
    let ngModuleDecorator: ts.Decorator | undefined;

    // ------------------------------------------------------------------
    // 1. Locate NgModule and extract metadata
    // ------------------------------------------------------------------
    const printer = createPrinter({ newLine: NewLineKind.LineFeed });

    let extractedProviders = '';
    let extractedImports = '';

    sourceFile.forEachChild(node => {
      if (isClassDeclaration(node)) {
        const decorators = canHaveDecorators(node)
          ? getDecorators(node)
          : undefined;
        if (!decorators) {
          return;
        }
        for (const d of decorators) {
          if (
            isCallExpression(d.expression) &&
            d.expression.expression.getText() === 'NgModule'
          ) {
            ngModuleNode = node;
            ngModuleDecorator = d;

            const arg = d.expression.arguments[0];
            if (arg && isObjectLiteralExpression(arg)) {
              for (const prop of arg.properties) {
                if (isPropertyAssignment(prop) && isIdentifier(prop.name)) {
                  if (prop.name.text === 'providers') {
                    extractedProviders = printer.printNode(
                      EmitHint.Unspecified,
                      prop.initializer,
                      sourceFile,
                    );
                  }
                  if (prop.name.text === 'imports') {
                    extractedImports = printer.printNode(
                      EmitHint.Unspecified,
                      prop.initializer,
                      sourceFile,
                    );
                  }
                }
              }
            }
          }
        }
      }
    });

    // ------------------------------------------------------------------
    // 2. Comment out NgModule decorator + class
    // ------------------------------------------------------------------
    // if (ngModuleNode && ngModuleDecorator) {
    //   const start = ngModuleDecorator.getStart();
    //   const end = ngModuleNode.getEnd();

    //   const commented = text.slice(start, end).replace(/^/gm, '// ');
    //   text = text.slice(0, start) + commented + text.slice(end);
    // }

    // ------------------------------------------------------------------
    // 3. Rename root component class
    // ------------------------------------------------------------------
    text = text.replace(
      new RegExp(`class\\s+${appClassOld}\\b`, 'g'),
      `class ${appClassNew}`,
    );

    text = text.replace(new RegExp(appClassOld, 'g'), appClassNew);

    // ------------------------------------------------------------------
    // 4. Rename start() → ProjectStartFunction
    // ------------------------------------------------------------------
    text = text.replace(
      new RegExp(`async function\\s+${startFnOld}\\b`, 'g'),
      `async function ${startFnNew}`,
    );

    text = text.replace(
      new RegExp(`export default\\s+${startFnOld}\\b`, 'g'),
      `export default ${startFnNew}`,
    );

    // ------------------------------------------------------------------
    // 5. Rename routes constant
    // ------------------------------------------------------------------
    text = text.replace(
      new RegExp(`const\\s+${routesOld}\\s*:\\s*Routes`, 'g'),
      `export const ${routesNew}: Routes`,
    );

    text = text.replace(new RegExp(routesOld, 'g'), routesNew);

    // ------------------------------------------------------------------
    // 6. Inject NgModule providers/imports into ApplicationConfig
    // ------------------------------------------------------------------
    // if (extractedProviders || extractedImports) {
    //   text = text.replace(/providers\s*:\s*\[/, match => {
    //     let extra = '';
    //     if (extractedProviders) {
    //       extra +=
    //         extractedProviders.replace(/^\[/, '').replace(/\]$/, '') + ',';
    //     }
    //     if (extractedImports) {
    //       extra += extractedImports.replace(/^\[/, '').replace(/\]$/, '') + ',';
    //     }
    //     return match + '\n' + extra;
    //   });
    // }

    // ------------------------------------------------------------------
    // 7. Ensure ServerConfig exists
    // ------------------------------------------------------------------

    if (!text.includes(`${projectName}ServerConfig`)) {
      text += applicationConfigTemplate(projectName);
    }

    if (!text.includes(`${projectName}ServerConfig`)) {
      text += serverNgPartTemplates(projectName);
    }

    if (!text.includes(`${projectName}Config`)) {
      text += ngMergeConfigTemplate(projectName);
    }

    return text;
    //#endregion
  };
  //#endregion

  //#region calculate relative import path function
  /**
   * Calculate relative import path between two project-relative files.
   *
   * @example
   * calculateRelativeImportPath(
   *   'mypath/to/file/here.ts',
   *   'mypath/to/other/file/there.ts'
   * )
   * => '../other/file/there'
   */
  export const calculateRelativeImportPath = (
    fileRelativePathFrom: string,
    fileRelativePathTo: string,
  ): string => {
    //#region @backendFunc
    // normalize to posix (important on Windows)
    const from = fileRelativePathFrom.replace(/\\/g, '/');
    const to = fileRelativePathTo.replace(/\\/g, '/');

    // dirname of source file
    const fromDir = path.posix.dirname(from);

    // relative path
    let relative = path.posix.relative(fromDir, to);

    // remove extension for TS/JS imports
    relative = relative.replace(/\.(ts|tsx|js|jsx)$/, '');

    // TS imports must start with ./ or ../
    if (!relative.startsWith('.')) {
      relative = './' + relative;
    }

    return relative;
    //#endregion
  };
  //#endregion

  //#region inject imports into imports region function
  export const injectImportsIntoImportsRegion = (
    content: string,
    importsToAdd: string[],
  ): string => {
    //#region @backendFunc
    if (!importsToAdd.length) {
      return content;
    }

    const importsBlock = importsToAdd.join('\n') + '\n';
    // optional comments / empty lines
    const regionHeaderRegex = new RegExp(
      '^' +
        '(\\/\\/\\#reg' +
        'ion\\s+imports\\s*\\r?\\n' +
        '(?:\\/\\/.*\\r?\\n|\\s*\\r?\\n)*)', // comments or empty lines
      'i',
    );

    const match = content.match(regionHeaderRegex);

    if (match) {
      // Inject directly after region header + comments
      return match[1] + importsBlock + content.slice(match[1].length);
    }

    // Fallback: prepend to file
    return importsBlock + content;
    //#endregion
  };
  //#endregion

  //#region parse ts diagnostic
  export interface ParsedTsDiagnostic {
    code?: number | string;
    category?: string;
    message: string;
    file?: string;
    line?: number;
    character?: number;
  }

  function categoryToString(cat?: number) {
    return cat === DiagnosticCategory.Error
      ? 'error'
      : cat === DiagnosticCategory.Warning
        ? 'warning'
        : cat === DiagnosticCategory.Suggestion
          ? 'suggestion'
          : cat === DiagnosticCategory.Message
            ? 'message'
            : 'unknown';
  }

  export function parseTsDiagnostic(
    diagnostic: ts.Diagnostic | any,
  ): ParsedTsDiagnostic[] {
    //#region @backendFunc
    const out: ParsedTsDiagnostic[] = [];

    const visit = (d: any) => {
      if (!d) return;

      // --- extract message ---
      const message =
        typeof d.messageText === 'string'
          ? d.messageText
          : flattenDiagnosticMessageText(d.messageText, '\n');

      let file: string | undefined;
      let line: number | undefined;
      let character: number | undefined;

      if (d.file && typeof d.start === 'number') {
        const pos = d.file.getLineAndCharacterOfPosition(d.start);
        file = d.file.fileName;
        line = pos.line + 1;
        character = pos.character + 1;
      }

      out.push({
        code: d.code,
        category: categoryToString(d.category),
        message,
        file,
        line,
        character,
      });

      // 🔴 THIS IS THE IMPORTANT PART
      if (Array.isArray(d.relatedInformation)) {
        for (const r of d.relatedInformation) {
          visit(r);
        }
      }
    };

    visit(diagnostic);
    return out;
    //#endregion
  }
  //#endregion

  //#region spliting namespaces
  export const NSSPLITNAMESAPCE = '__NS__';

  //#region spliting namespaces / normalize content
  export const hoistTrailingChainComments = (code: string): string => {
    return code.replace(
      /(.*?)(\/\/[^\n]*?)\n(\s*\.)/g,
      (_m, expr, comment, dot) => `${comment}\n${expr.trim()}\n${dot}`,
    );
  };

  export const normalizeBrokenLines = (code: string): string => {
    //#region @backendFunc
    code = hoistTrailingChainComments(code);

    const sourceFile = createSourceFile(
      'file.ts',
      code,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const transformer: TransformerFactory<ts.SourceFile> = context => {
      const { factory } = context;

      const visit = (node: ts.Node): ts.Node => {
        // ---- CallExpression: rebuild callee + args
        if (isCallExpression(node)) {
          const newExpression = visitNode(
            node.expression,
            visit,
          ) as ts.Expression;

          const newArguments = node.arguments.map(
            arg => visitNode(arg, visit) as ts.Expression,
          );

          const newTypeArguments = node.typeArguments?.map(
            ta => visitNode(ta, visit) as ts.TypeNode,
          );

          return factory.updateCallExpression(
            node,
            newExpression,
            newTypeArguments,
            newArguments,
          );
        }

        // ---- PropertyAccessExpression: rebuild chain
        if (isPropertyAccessExpression(node)) {
          const newExpression = visitNode(
            node.expression,
            visit,
          ) as ts.Expression;

          return factory.updatePropertyAccessExpression(
            node,
            newExpression,
            node.name,
          );
        }

        return visitEachChild(node, visit, context);
      };

      return (sf: ts.SourceFile): ts.SourceFile => {
        return visitEachChild(sf, visit, context);
      };
    };

    const result = transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0] as ts.SourceFile;

    const printer = createPrinter({
      newLine: NewLineKind.LineFeed,
      removeComments: false,
    });

    let output = printer.printFile(transformedSourceFile);
    result.dispose();

    output = collapseFluentChains(output);
    return output;
    //#endregion
  };

  export const collapseFluentChains = (code: string): string => {
    return code.replace(/(\S)\n\s*\./g, '$1.');
  };
  //#endregion

  //#region spliting namespaces / result interface
  export interface SplitNamespaceResult {
    content?: string;
    /**
     * EXAMPLE:
     *  namespacesMapObj: {
     *  'Utils.wait': 'Utils_wait',
     *  'Utils.waitMilliseconds': 'Utils_waitMilliseconds',
     * }
     */
    namespacesMapObj: { [namespaceDotPath: string]: string };
    /**
     * namespacesReplace: {
     *  Utils: [
     *  'Utils_DbBinaryFormat',
     *  'Utils_DbBinaryFormatEnum',
     *  ],
     *  UtilsCliClassMethod: [
     *  'UtilsCliClassMethod_CLI_METHOD_KEY',
     *  'UtilsCliClassMethod_argsToParse',
     *  ]
     * }
     */
    namespacesReplace: { [rootNamespace: string]: string[] };
    /**
     * Everything from namespacesMapObj except types, interfaces etc.
     */
    namespacesMapObjJS?: { [namespaceDotPath: string]: string };
    /**
     * Everything from namespacesReplace except types, interfaces etc.
     */
    namespacesReplaceJS?: { [rootNamespace: string]: string[] };
  }
  //#endregion

  //#region spliting namespaces / split for content
  export const splitNamespaceForContent = (
    content: string,
  ): SplitNamespaceResult => {
    //#region @backendFunc
    const getRootQualifiedName = (qn: ts.QualifiedName): ts.QualifiedName => {
      let current = qn;
      while (isQualifiedName(current.parent)) {
        current = current.parent;
      }
      return current;
    };

    const getRootPropertyAccess = (
      node: ts.PropertyAccessExpression,
    ): ts.Expression => {
      let current: ts.Expression = node;
      while (isPropertyAccessExpression(current.parent)) {
        current = current.parent;
      }
      return current;
    };

    type Range = { start: number; end: number };
    type Edit = { start: number; end: number; text: string };

    const namespacesMapObj: { [k: string]: string } = {};
    const namespacesReplace: { [k: string]: string[] } = {};
    const namespacesMapObjJS: { [k: string]: string } = {};
    const namespacesReplaceJS: { [k: string]: string[] } = {};

    const inAnyRange = (pos: number, ranges: Range[]) =>
      ranges.some(r => pos >= r.start && pos <= r.end);

    const isRuntimeSymbol = (symbol: ts.Symbol): boolean => {
      const flags = symbol.getFlags();

      return (
        (flags & SymbolFlags.Value) !== 0 && (flags & SymbolFlags.Type) === 0
      );
    };

    // const intersectsAnyRange = (
    //   spanStart: number,
    //   spanEnd: number,
    //   ranges: Range[],
    // ) =>
    //   ranges.some(
    //     r => Math.max(spanStart, r.start) <= Math.min(spanEnd, r.end),
    //   );

    const applyEdits = (text: string, edits: Edit[]): string => {
      edits.sort((a, b) => b.start - a.start);
      let out = text;
      for (const e of edits) {
        out = out.slice(0, e.start) + e.text + out.slice(e.end);
      }
      return out;
    };

    const regionRanges = [{ start: 0, end: content.length }];

    // ---------------------------------------------
    // Phase 1: Parse + TypeChecker
    // ---------------------------------------------
    const sourceFile = createSourceFile(
      'file.ts',
      content,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const program = createProgram({
      rootNames: ['file.ts'],
      options: { target: ScriptTarget.ESNext } as any,
      host: {
        ...createCompilerHost({}),
        getSourceFile: fileName =>
          fileName === 'file.ts' ? sourceFile : (undefined as any),
        readFile: () => content,
        fileExists: () => true,
        writeFile: () => {},
        getCanonicalFileName: f => f,
        getCurrentDirectory: () => '',
        getNewLine: () => '\n',
      },
    });

    const checker = program.getTypeChecker();

    type NsCtx = { fullPrefix: string; dotPrefix: string };
    const nsStack: NsCtx[] = [];
    const symbolRename = new Map<ts.Symbol, string>();

    // ---------------------------------------------
    // Phase 2: Collect namespace API
    // ---------------------------------------------
    const collect = (node: ts.Node): void => {
      const nodePos = node.getStart(sourceFile, false);

      if (isModuleDeclaration(node) && isIdentifier(node.name)) {
        const parent = nsStack[nsStack.length - 1];
        const fullPrefix = parent
          ? `${parent.fullPrefix}${NSSPLITNAMESAPCE}${node.name.text}`
          : node.name.text;
        const dotPrefix = parent
          ? `${parent.dotPrefix}.${node.name.text}`
          : node.name.text;

        nsStack.push({ fullPrefix, dotPrefix });

        if (node.body && isModuleBlock(node.body)) {
          node.body.statements.forEach(collect);
        } else {
          forEachChild(node, collect);
        }

        nsStack.pop();
        return;
      }

      const inNamespace = nsStack.length > 0;
      const inRegion = inAnyRange(nodePos, regionRanges);

      const hasExportModifier = (n: ts.Node): boolean =>
        !!(canHaveModifiers(n)
          ? getModifiers(n)?.some(m => m.kind === SyntaxKind.ExportKeyword)
          : false);

      const isExportedVarInNamespace = (n: ts.Node): boolean => {
        if (!isVariableDeclaration(n)) return false;
        const stmt = n.parent?.parent;
        return !!stmt && isVariableStatement(stmt) && hasExportModifier(stmt);
      };

      if (inNamespace && inRegion) {
        if (
          (isFunctionDeclaration(node) ||
            isClassDeclaration(node) ||
            isInterfaceDeclaration(node) ||
            isTypeAliasDeclaration(node) ||
            isEnumDeclaration(node) ||
            isImportEqualsDeclaration(node)) &&
          hasExportModifier(node)
        ) {
          const name = (node as any).name;
          if (name && isIdentifier(name)) {
            const symbol = checker.getSymbolAtLocation(name);
            const isJS = symbol && isRuntimeSymbol(symbol);
            const ctx = nsStack.at(-1);
            if (symbol && ctx) {
              const newName = `${ctx.fullPrefix}${NSSPLITNAMESAPCE}${name.text}`;
              symbolRename.set(symbol, newName);
              namespacesMapObj[`${ctx.dotPrefix}.${name.text}`] = newName;
              (namespacesReplace[ctx.fullPrefix.split(NSSPLITNAMESAPCE)[0]] ||=
                []).push(newName);

              if (isJS) {
                namespacesMapObjJS[`${ctx.dotPrefix}.${name.text}`] = newName;
                (namespacesReplaceJS[
                  ctx.fullPrefix.split(NSSPLITNAMESAPCE)[0]
                ] ||= []).push(newName);
              }
            }
          }
        }

        if (isExportedVarInNamespace(node)) {
          const decl = node as ts.VariableDeclaration;
          const name = decl.name;

          if (isIdentifier(name)) {
            const symbol = checker.getSymbolAtLocation(name);
            const isJS = symbol && isRuntimeSymbol(symbol);
            const ctx = nsStack.at(-1);

            if (symbol && ctx) {
              const newName = `${ctx.fullPrefix}${NSSPLITNAMESAPCE}${name.text}`;
              symbolRename.set(symbol, newName);
              namespacesMapObj[`${ctx.dotPrefix}.${name.text}`] = newName;
              (namespacesReplace[ctx.fullPrefix.split(NSSPLITNAMESAPCE)[0]] ||=
                []).push(newName);
              if (isJS) {
                namespacesMapObjJS[`${ctx.dotPrefix}.${name.text}`] = newName;
                (namespacesReplaceJS[
                  ctx.fullPrefix.split(NSSPLITNAMESAPCE)[0]
                ] ||= []).push(newName);
              }
            }
          }
        }
      }

      forEachChild(node, collect);
    };

    collect(sourceFile);

    Object.keys(namespacesReplace).forEach(k => {
      namespacesReplace[k] = Array.from(new Set(namespacesReplace[k])).sort();
    });

    // ---------------------------------------------
    // Phase 3: Rename usages (FINAL FIX)
    // ---------------------------------------------
    const renameEdits: Edit[] = [];

    const collectIdentifierEdits = (node: ts.Node): void => {
      if (!inAnyRange(node.getStart(sourceFile, false), regionRanges)) {
        forEachChild(node, collectIdentifierEdits);
        return;
      }

      if (isPropertyAccessExpression(node)) {
        const symbol = checker.getSymbolAtLocation(node.name);
        const newName = symbol && symbolRename.get(symbol);

        if (newName) {
          const root = getRootPropertyAccess(node);

          renameEdits.push({
            start: root.getStart(sourceFile, false),
            end: root.getEnd(),
            text: newName,
          });

          return; // 🚨 do NOT recurse
        }
      }

      // 🔥 TYPE-ONLY namespace access (A.B.C.Type)
      if (isQualifiedName(node)) {
        const symbol = checker.getSymbolAtLocation(node.right);
        const newName = symbol && symbolRename.get(symbol);

        if (newName) {
          const root = getRootQualifiedName(node);

          renameEdits.push({
            start: root.getStart(sourceFile, false),
            end: root.getEnd(),
            text: newName,
          });

          return; // 🚨 CRITICAL: stop traversal
        }
      }

      // Fallback: plain identifiers (non-property access)
      if (isIdentifier(node)) {
        if (node.text === 'this' || node.text === 'super') return;

        const symbol = checker.getSymbolAtLocation(node);
        const newName = symbol && symbolRename.get(symbol);
        if (!newName || node.text === newName) return;

        renameEdits.push({
          start: node.getStart(sourceFile, false),
          end: node.getEnd(),
          text: newName,
        });
        return;
      }

      forEachChild(node, collectIdentifierEdits);
    };

    collectIdentifierEdits(sourceFile);

    const renamedContent = applyEdits(content, renameEdits);

    // ---------------------------------------------
    // Phase 4: Replace namespaces → regions
    // ---------------------------------------------
    const sf2 = createSourceFile(
      'file.ts',
      renamedContent,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    type NsReplace = {
      openStart: number;
      openEnd: number;
      closeStart: number;
      closeEnd: number;
      fullPrefix: string;
    };

    const nsReplaces: NsReplace[] = [];
    const nsStack2: { fullPrefix: string }[] = [];

    const collectNamespaceReplaces = (node: ts.Node): void => {
      if (isModuleDeclaration(node) && isIdentifier(node.name)) {
        const parent = nsStack2.at(-1);
        const fullPrefix = parent
          ? `${parent.fullPrefix}${NSSPLITNAMESAPCE}${node.name.text}`
          : node.name.text;

        nsStack2.push({ fullPrefix });

        if (node.body && isModuleBlock(node.body)) {
          const openBrace = node.body.getStart(sf2, false);
          const closeBrace = node.body.getEnd() - 1;

          nsReplaces.push({
            openStart: node.getStart(sf2, false),
            openEnd: openBrace + 1,
            closeStart: closeBrace,
            closeEnd: closeBrace + 1,
            fullPrefix,
          });

          node.body.statements.forEach(collectNamespaceReplaces);
        }

        nsStack2.pop();
        return;
      }

      forEachChild(node, collectNamespaceReplaces);
    };

    collectNamespaceReplaces(sf2);

    const nsEdits: Edit[] = [];
    nsReplaces.sort((a, b) => b.openStart - a.openStart);

    for (const ns of nsReplaces) {
      nsEdits.push({
        start: ns.openStart,
        end: ns.openEnd,
        text: `//namespace ${ns.fullPrefix}\n`,
      });
      nsEdits.push({
        start: ns.closeStart,
        end: ns.closeEnd,
        text: `\n//end of namespace ${ns.fullPrefix}\n`,
      });
    }

    return {
      content: applyEdits(renamedContent, nsEdits),
      namespacesMapObj,
      namespacesReplace,
      namespacesMapObjJS,
      namespacesReplaceJS,
    };

    //#endregion
  };
  //#endregion

  //#region spliting namespaces / split for file
  export const splitNamespaceForFile = (fileAbsPath: string): string => {
    //#region @backendFunc
    return splitNamespaceForContent(UtilsFilesFoldersSync.readFile(fileAbsPath))
      .content;
    //#endregion
  };
  //#endregion

  //#region spliting namespaces / replace namespaces with long names
  export const replaceNamespaceWithLongNames = (
    content: string,
    namespacesMapObj: SplitNamespaceResult['namespacesMapObj'],
  ): string => {
    //#region @backendFunc
    if (!content || Object.keys(namespacesMapObj || {}).length === 0) {
      return content;
    }
    const keyPaths = Object.keys(namespacesMapObj).sort((a, b) => {
      const aParts = a.split('.').length;
      const bParts = b.split('.').length;

      // 1) deeper first (more dots)
      if (aParts !== bParts) return bParts - aParts;

      // 2) longer first
      if (a.length !== b.length) return b.length - a.length;

      // 3) stable fallback
      return a.localeCompare(b);
    });

    for (const keyPath of keyPaths) {
      content = content.replace(
        new RegExp(`\\b${Utils.escapeStringForRegEx(keyPath)}\\b`, 'g'),
        namespacesMapObj[keyPath],
      );
    }
    return content;
    //#endregion
  };
  //#endregion

  //#region spliting namespaces / replace import namepspace with exploaded ns
  export const replaceImportNamespaceWithWithExplodedNamespace = (
    content: string,
    namespacesReplace: SplitNamespaceResult['namespacesReplace'],
    renamedImportsOrExports: RenamedImportOrExport[],
    currentPackageName: string,
    replaceInAllImports = false,
  ): string => {
    //#region @backendFunc
    if (
      !content ||
      !namespacesReplace ||
      Object.keys(namespacesReplace).length === 0
    ) {
      return content;
    }

    // ------------------------------------------------------------
    // Source filtering
    // ------------------------------------------------------------

    const isRelative = (spec?: ts.Expression): boolean =>
      !!spec &&
      isStringLiteral(spec) &&
      (spec.text.startsWith('./') || spec.text.startsWith('../'));

    const isAllowedImportSource = (
      moduleSpecifier?: ts.Expression,
    ): boolean => {
      if (!moduleSpecifier || !isStringLiteral(moduleSpecifier)) return false;

      const spec = moduleSpecifier.text;

      // always allow current package (and subpaths)
      if (
        spec === currentPackageName ||
        spec.startsWith(currentPackageName + '/')
      ) {
        return true;
      }

      // allow relative traversal only when explicitly enabled
      if (replaceInAllImports && isRelative(moduleSpecifier)) {
        return true;
      }

      return false;
    };

    const aliasMap = new Map<string, string>();

    for (const r of renamedImportsOrExports) {
      if (!r?.elementName || !r?.renamedAs) continue;
      if (r.packageName && r.packageName !== currentPackageName) continue;

      aliasMap.set(r.elementName, r.renamedAs);
    }

    // ------------------------------------------------------------
    // Setup
    // ------------------------------------------------------------

    type Edit = { start: number; end: number; text: string };
    const edits: Edit[] = [];

    const sf = createSourceFile(
      'file.ts',
      content,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const trim = (s: string) => s.trim();
    const uniq = <T>(arr: T[]) => Array.from(new Set(arr));
    const sortStable = (arr: string[]) =>
      [...arr].sort((a, b) => a.localeCompare(b));
    const getText = (n: ts.Node) =>
      content.slice(n.getStart(sf, false), n.getEnd());

    // ------------------------------------------------------------
    // Precompute namespace explosion tables
    // ------------------------------------------------------------

    // root namespace -> exploded symbols
    const nsToExploded = new Map<string, string[]>();

    // exploded symbol -> root namespace
    const explodedToRootNs = new Map<string, string>();

    for (const [rootNs, explodedRaw] of Object.entries(namespacesReplace)) {
      const exploded = sortStable(
        uniq((explodedRaw || []).map(trim).filter(Boolean)),
      );
      if (exploded.length === 0) continue;

      nsToExploded.set(rootNs, exploded);
      for (const ex of exploded) {
        if (!explodedToRootNs.has(ex)) {
          explodedToRootNs.set(ex, rootNs);
        }
      }
    }

    // ------------------------------------------------------------
    // Specifier rewrite (imports + exports)
    // ------------------------------------------------------------

    type Spec = ts.ImportSpecifier | ts.ExportSpecifier;

    const rewriteNamedSpecifiers = (
      named: ts.NamedImports | ts.NamedExports,
      elements: readonly Spec[],
    ) => {
      /**
       * LOCAL name -> metadata
       * - imported: original exported name
       * - local: identifier used in this file
       */
      const existing = new Map<
        string,
        { imported: string; local: string; text: string }
      >();

      for (const el of elements) {
        const imported = el.propertyName ? el.propertyName.text : el.name.text;
        const local = el.name.text;
        existing.set(local, { imported, local, text: getText(el) });
      }

      /**
       * Which LOCAL namespaces should be exploded
       * (important: explosion is driven by local alias!)
       */
      const localsToExplode = new Set<string>();

      if (!replaceInAllImports) {
        // explode only if namespace symbol itself is present
        for (const { imported, local } of existing.values()) {
          if (nsToExploded.has(imported)) {
            localsToExplode.add(local);
          }
        }
      } else {
        // explode if:
        // - namespace itself is present, OR
        // - any exploded symbol from that namespace is present
        for (const { imported, local } of existing.values()) {
          if (nsToExploded.has(imported)) {
            localsToExplode.add(local);
            continue;
          }

          const rootNs = explodedToRootNs.get(imported);
          if (rootNs) {
            localsToExplode.add(local);
          }
        }
      }

      if (localsToExplode.size === 0) return;

      // ------------------------------------------------------------
      // Build replacement
      // ------------------------------------------------------------

      const toRemove = new Set<string>(); // LOCAL names
      const toAdd: string[] = [];

      for (const localNs of localsToExplode) {
        const meta = existing.get(localNs);
        if (!meta) continue;

        const rootNs = meta.imported;

        // remove the namespace specifier itself
        toRemove.add(localNs);

        const exploded = nsToExploded.get(rootNs) || [];

        // rewrite exploded symbol to use LOCAL alias
        // const localEx = ex.startsWith(rootNs + '_')
        //   ? localNs + '_' + ex.slice(rootNs.length + 1)
        //   : ex;

        // if (!existing.has(localEx)) {
        //   toAdd.push(localEx);
        // }

        const aliasLocalNs = aliasMap.get(rootNs); // Models → ModelsNg2Rest

        for (const ex of exploded) {
          if (!ex.startsWith(rootNs + NSSPLITNAMESAPCE)) continue;

          const localName = aliasLocalNs
            ? aliasLocalNs +
              NSSPLITNAMESAPCE +
              ex.slice(rootNs.length + NSSPLITNAMESAPCE.length)
            : ex;
          const finalImport = aliasLocalNs
            ? `${ex} as ${localName}` // 🔥 THIS IS THE FIX
            : localName;

          if (!existing.has(localName)) {
            toAdd.push(finalImport);
          }
        }
      }

      // keep all non-removed specifiers (preserve formatting)
      const keptTexts: string[] = [];
      for (const el of elements) {
        const local = el.name.text;
        if (!toRemove.has(local)) {
          keptTexts.push(getText(el));
        }
      }

      const finalParts = [...keptTexts, ...sortStable(uniq(toAdd))];
      if (finalParts.length === 0) return;

      const newNamed = `{ ${finalParts.join(', ')} }`;

      edits.push({
        start: named.getStart(sf, false),
        end: named.getEnd(),
        text: newNamed,
      });
    };

    // ------------------------------------------------------------
    // AST traversal
    // ------------------------------------------------------------

    const visit = (node: ts.Node): void => {
      // ----- imports -----
      if (isImportDeclaration(node)) {
        if (!isAllowedImportSource(node.moduleSpecifier)) return;

        const clause = node.importClause;
        if (clause?.namedBindings && isNamedImports(clause.namedBindings)) {
          rewriteNamedSpecifiers(
            clause.namedBindings,
            clause.namedBindings.elements,
          );
        }
      }

      // ----- exports -----
      if (isExportDeclaration(node)) {
        if (!isAllowedImportSource(node.moduleSpecifier)) return;

        if (node.exportClause && isNamedExports(node.exportClause)) {
          rewriteNamedSpecifiers(node.exportClause, node.exportClause.elements);
        }
      }

      forEachChild(node, visit);
    };

    visit(sf);

    if (edits.length === 0) return content;

    // ------------------------------------------------------------
    // Apply edits back-to-front
    // ------------------------------------------------------------

    edits.sort((a, b) => b.start - a.start);
    let out = content;
    for (const e of edits) {
      out = out.slice(0, e.start) + e.text + out.slice(e.end);
    }

    return out;
    //#endregion
  };
  //#endregion

  //#region spliting namespaces / update result with renames
  export const updateSplitNamespaceResultMapReplaceObj = (
    result: SplitNamespaceResult,
    renamedList: RenamedImportOrExport[],
  ): SplitNamespaceResult => {
    //#region @backendFunc
    if (!result) {
      return { namespacesMapObj: {}, namespacesReplace: {} };
    }
    if (!Array.isArray(renamedList) || renamedList.length === 0) {
      return result;
    }

    // shallow clone once
    const next: SplitNamespaceResult = {
      namespacesMapObj: { ...result.namespacesMapObj },
      namespacesReplace: { ...result.namespacesReplace },
      content: result.content,
    };

    const uniqSorted = (arr: string[]) => Array.from(new Set(arr)).sort();

    const applyOne = (renamed: RenamedImportOrExport) => {
      const elementName = renamed?.elementName?.trim();
      const renamedAs = renamed?.renamedAs?.trim();

      if (!elementName || !renamedAs || elementName === renamedAs) return;

      const prefixDot = `${elementName}.`;
      const prefixUnder = `${elementName}${NSSPLITNAMESAPCE}`;
      const newPrefixDot = `${renamedAs}.`;
      const newPrefixUnder = `${renamedAs}${NSSPLITNAMESAPCE}`;

      // ---------- 1️⃣ namespacesReplace (CLONE, do NOT delete original)
      const srcReplace = next.namespacesReplace[elementName];
      if (srcReplace) {
        const dst = next.namespacesReplace[renamedAs] || [];
        next.namespacesReplace[renamedAs] = uniqSorted([
          ...dst,
          ...srcReplace.map(v =>
            v.startsWith(prefixUnder)
              ? newPrefixUnder + v.slice(prefixUnder.length)
              : v,
          ),
        ]);
      }

      // ---------- 2️⃣ namespacesMapObj (CLONE entries)
      const additions: SplitNamespaceResult['namespacesMapObj'] = {};

      for (const [k, v] of Object.entries(next.namespacesMapObj)) {
        if (k === elementName) {
          additions[renamedAs] = renamedAs;
          continue;
        }

        if (k.startsWith(prefixDot)) {
          const newK = newPrefixDot + k.slice(prefixDot.length);
          const newV = v.replace(
            new RegExp(`^${Utils.escapeStringForRegEx(prefixUnder)}`),
            newPrefixUnder,
          );
          additions[newK] = newV;
        }
      }

      // merge additions (do NOT replace whole object)
      next.namespacesMapObj = {
        ...next.namespacesMapObj,
        ...additions,
      };
    };

    // Apply in order (important if multiple aliases chain)
    for (const r of renamedList) applyOne(r);

    // Final dedupe/sort for all replace lists (in case merges happened)
    for (const k of Object.keys(next.namespacesReplace)) {
      next.namespacesReplace[k] = uniqSorted(next.namespacesReplace[k] || []);
    }

    return next;
    //#endregion
  };
  //#endregion

  export const updateSplitNamespaceReExports = (
    splitNamespacesForPackages: Map<
      string,
      UtilsTypescript.SplitNamespaceResult
    >,
    reExports: Map<string, UtilsTypescript.GatheredExportsMap>,
  ): void => {
    //#region @backendFunc
    for (const [pkgName, exportedMap] of reExports.entries()) {
      const targetSplit = splitNamespacesForPackages.get(pkgName);
      if (!targetSplit) continue;

      for (const [sourcePkg, exported] of Object.entries(exportedMap)) {
        const sourceSplit = splitNamespacesForPackages.get(sourcePkg);
        if (!sourceSplit) continue;

        const namespacesToImport =
          exported === '*'
            ? Object.keys(sourceSplit.namespacesReplace)
            : exported;

        for (const ns of namespacesToImport) {
          // ---------- namespacesReplace ----------
          const sourceReplaceArr = sourceSplit.namespacesReplace[ns];
          if (sourceReplaceArr?.length) {
            targetSplit.namespacesReplace[ns] ??= [];
            targetSplit.namespacesReplace[ns].push(...sourceReplaceArr);
          }

          // ---------- namespacesMapObj ----------
          for (const [dotPath, flatName] of Object.entries(
            sourceSplit.namespacesMapObj,
          )) {
            if (dotPath === ns || dotPath.startsWith(ns + '.')) {
              targetSplit.namespacesMapObj[dotPath] ??= flatName;
            }
          }
        }
      }
    }

    // ---- dedupe namespacesReplace arrays
    for (const split of splitNamespacesForPackages.values()) {
      split.namespacesReplace = split.namespacesReplace || {};
      for (const ns of Object.keys(split.namespacesReplace)) {
        split.namespacesReplace[ns] = [...new Set(split.namespacesReplace[ns])];
      }
    }
    //#endregion
  };

  //#region spliting namespaces / gather exported third-party namespaces
  type PackageName = string;

  export type ExportedThirdPartyNamespaces = '*' | string[];

  export type GatheredExportsMap = {
    [packageName: string]: ExportedThirdPartyNamespaces;
  };

  const gatherPackageExportedThirdPartyNamespaces = (
    program: ts.Program,
    entryFilePath: string,
    onlyConsideThisIsomorphicImport: Map<PackageName, SplitNamespaceResult>,
  ): GatheredExportsMap => {
    //#region @backendFunc
    const checker = program.getTypeChecker();
    const result: GatheredExportsMap = {};

    const entrySourceFile = program.getSourceFile(entryFilePath);
    if (!entrySourceFile) return result;

    const entrySymbol = checker.getSymbolAtLocation(entrySourceFile);
    if (!entrySymbol) return result;

    const exportedSymbols = checker.getExportsOfModule(entrySymbol);

    for (const symbol of exportedSymbols) {
      // 🔑 DO NOT resolve alias here
      for (const decl of symbol.declarations ?? []) {
        if (!isExportSpecifier(decl) && !isExportDeclaration(decl)) {
          continue;
        }

        const exportDecl = isExportSpecifier(decl) ? decl.parent.parent : decl;

        if (!isExportDeclaration(exportDecl)) continue;
        if (!exportDecl.moduleSpecifier) continue;

        const pkgName = getCleanImport(
          (exportDecl.moduleSpecifier as ts.StringLiteral).text,
        );
        const split = onlyConsideThisIsomorphicImport.get(pkgName);
        if (!split) continue;

        // export * from 'pkg'
        if (!exportDecl.exportClause) {
          result[pkgName] = '*';
          continue;
        }

        // export { Models } from 'pkg'
        if (isNamedExports(exportDecl.exportClause)) {
          const names = exportDecl.exportClause.elements
            .map(e => e.name.text)
            .filter(n => split.namespacesReplace[n]);

          if (!names.length) continue;
          if (result[pkgName] === '*') continue;

          result[pkgName] ??= [];
          (result[pkgName] as string[]).push(...names);
        }
      }
    }

    // dedupe
    for (const k in result) {
      if (Array.isArray(result[k])) {
        result[k] = [...new Set(result[k])];
      }
    }

    return result;
    //#endregion
  };

  export const gatherExportsMapFromIndex = (
    pathToIndexTs: string,
    isomorphicImportsMap: Map<PackageName, SplitNamespaceResult>,
  ): GatheredExportsMap => {
    //#region @backendFunc
    const program = createProgram({
      rootNames: [pathToIndexTs],
      options: {
        target: ScriptTarget.ESNext,
        module: ModuleKind.ESNext,
      },
    });

    const exportsMap = gatherPackageExportedThirdPartyNamespaces(
      program,
      pathToIndexTs,
      isomorphicImportsMap,
    );

    return exportsMap;
    //#endregion
  };

  //#endregion

  //#endregion

  //#region get clean import
  export const getCleanImport = (importName: string): string | undefined => {
    if (!importName) {
      return importName;
    }
    return importName
      .replace(
        new RegExp(Utils.escapeStringForRegEx(`/browser-prod`) + '$'),
        '',
      )
      .replace(new RegExp(Utils.escapeStringForRegEx(`/websql-prod`) + '$'), '')
      .replace(new RegExp(Utils.escapeStringForRegEx(`/lib-prod`) + '$'), '')
      .replace(new RegExp(Utils.escapeStringForRegEx(`/browser`) + '$'), '')
      .replace(new RegExp(Utils.escapeStringForRegEx(`/websql`) + '$'), '')
      .replace(new RegExp(Utils.escapeStringForRegEx(`/lib`) + '$'), '');
  };
  //#endregion

  //#region refactor classses into namespaces

  export const refactorClassToNamespace = (sourceText: string): string => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceText,
      ScriptTarget.Latest,
      true,
    );

    const printer = createPrinter({ newLine: NewLineKind.LineFeed });
    const statements: ts.Statement[] = [];

    const capitalize = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1);

    /**
     * Rewrites `this.x` → `x`
     */
    const rewriteThis = (block?: ts.Block): ts.Block | undefined => {
      //#region @backendFunc
      if (!block) return block;

      const transformer: ts.TransformerFactory<ts.Node> = context => root => {
        const visit = (node: ts.Node): ts.Node => {
          if (
            isPropertyAccessExpression(node) &&
            node.expression.kind === SyntaxKind.ThisKeyword
          ) {
            return factory.createIdentifier(node.name.text);
          }
          return visitEachChild(node, visit, context);
        };
        return visitNode(root, visit);
      };

      const result = transform(block, [transformer]);
      return result.transformed[0] as ts.Block;
      //#endregion
    };

    /**
     * Creates: export const name = () => { ... }
     */
    const createExportedArrowFunction = (
      name: string,
      parameters: readonly ts.ParameterDeclaration[],
      type: ts.TypeNode | undefined,
      body: ts.Block | undefined,
    ): ts.Statement => {
      return factory.createVariableStatement(
        [factory.createModifier(SyntaxKind.ExportKeyword)],
        factory.createVariableDeclarationList(
          [
            factory.createVariableDeclaration(
              name,
              undefined,
              undefined,
              factory.createArrowFunction(
                undefined,
                undefined,
                parameters,
                type,
                factory.createToken(SyntaxKind.EqualsGreaterThanToken),
                body ?? factory.createBlock([], true),
              ),
            ),
          ],
          NodeFlags.Const,
        ),
      );
    };

    sourceFile.forEachChild(node => {
      if (!isClassDeclaration(node) || !node.name) {
        statements.push(node as ts.Statement);
        return;
      }

      const namespaceMembers: ts.Statement[] = [];

      for (const member of node.members) {
        // ===== Fields =====
        if (isPropertyDeclaration(member) && member.name) {
          const name = member.name as ts.Identifier;
          const isPublic =
            !member.modifiers ||
            member.modifiers.some(m => m.kind === SyntaxKind.PublicKeyword);

          namespaceMembers.push(
            factory.createVariableStatement(
              isPublic
                ? [factory.createModifier(SyntaxKind.ExportKeyword)]
                : undefined,
              factory.createVariableDeclarationList(
                [
                  factory.createVariableDeclaration(
                    name.text,
                    undefined,
                    undefined,
                    member.initializer,
                  ),
                ],
                NodeFlags.Const,
              ),
            ),
          );
        }

        // ===== Getter → export const getX = () => {} =====
        if (isGetAccessorDeclaration(member) && member.name) {
          const name = member.name as ts.Identifier;

          namespaceMembers.push(
            createExportedArrowFunction(
              `get${capitalize(name.text)}`,
              [],
              undefined,
              rewriteThis(member.body),
            ),
          );
        }

        // ===== Methods → export const fn = () => {} =====
        if (isMethodDeclaration(member) && member.name) {
          const name = member.name as ts.Identifier;

          namespaceMembers.push(
            createExportedArrowFunction(
              name.text,
              member.parameters,
              member.type,
              rewriteThis(member.body),
            ),
          );
        }
      }

      statements.push(
        factory.createModuleDeclaration(
          [factory.createModifier(SyntaxKind.ExportKeyword)],
          factory.createIdentifier(node.name.text),
          factory.createModuleBlock(namespaceMembers),
          NodeFlags.Namespace,
        ),
      );
    });

    const newFile = factory.updateSourceFile(sourceFile, statements);
    return printer.printFile(newFile);
    //#endregion
  };
  //#endregion
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
