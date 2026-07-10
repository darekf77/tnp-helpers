import type { BuildOptions } from 'esbuild';
import {
  crossPlatformPath,
  fse,
  path,
  UtilsFilesFoldersSync,
} from 'tnp-core/src';

export namespace UtilsCjsPackage {
  //#region models
  export interface BuildCjsVersionOptions {
    /**
     * Output folder inside the package.
     *
     * Example:
     * node_modules/@angular/compiler/cjs
     */
    outputFolder?: string;

    /**
     * Export subpath added to package.json.
     *
     * Example:
     * import '@angular/compiler/cjs'
     */
    exportSubpath?: string;

    /**
     * Node target used by esbuild.
     */
    target?: string;

    /**
     * Rebuild even when generated output already exists.
     */
    force?: boolean;

    /**
     * Additional esbuild configuration.
     */
    esbuildOptions?: Partial<BuildOptions>;
  }

  export interface BuildCjsVersionResult {
    packageName: string;
    packageRoot: string;
    sourceEntry: string;
    outputEntry: string;
    sourceTypes?: string;
    outputTypes?: string;
    importPath: string;
  }
  //#endregion

  //#region build cjs version for
  export async function buildCjsVersionFor(
    packageName: string,
    pathToNodeModulesRoot: string,
    overrideOutputFolder = 'cjs',
    options: Omit<BuildCjsVersionOptions, 'outputFolder'> = {},
  ): Promise<void> {
    //#region @backendFunc
    const nodeModulesRoot = path.resolve(pathToNodeModulesRoot);
    const packageRoot = crossPlatformPath(
      path.join(nodeModulesRoot, ...packageName.split('/')),
    );

    const packageJsonPath = crossPlatformPath([packageRoot, 'package.json']);
    const packageJsonCjsPath = crossPlatformPath([
      packageRoot,
      overrideOutputFolder,
      'package.json',
    ]);

    if (!(await fse.pathExists(packageJsonPath))) {
      throw new Error(
        `Cannot build CJS version of "${packageName}". ` +
          `Package does not exist at: ${packageRoot}`,
      );
    }

    const packageJsonContent = await fse.readFile(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent) as PackageJsonLike;

    const outputFolder = normalizeRelativePath(overrideOutputFolder);
    const exportSubpath =
      options.exportSubpath ?? `./${outputFolder.replace(/\/+$/, '')}`;

    const rootExport = getRootExport(packageJson.exports);

    const sourceEntryRelative =
      findConditionalPath(rootExport, [
        'import',
        'module',
        'node',
        'default',
        'require',
      ]) ??
      packageJson.module ??
      packageJson.main;

    if (!sourceEntryRelative) {
      throw new Error(
        `Cannot determine JavaScript entry for "${packageName}". ` +
          `No usable exports["."], module, or main field was found.`,
      );
    }

    const sourceEntry = resolveInsidePackage(packageRoot, sourceEntryRelative);

    if (!(await fse.pathExists(sourceEntry))) {
      throw new Error(
        `Resolved JavaScript entry for "${packageName}" does not exist:\n` +
          `${sourceEntry}\n` +
          `Resolved from: ${sourceEntryRelative}`,
      );
    }

    const sourceTypesRelative =
      findConditionalPath(rootExport, ['types', 'typings']) ??
      packageJson.types ??
      packageJson.typings;

    const sourceTypes = sourceTypesRelative
      ? resolveInsidePackage(packageRoot, sourceTypesRelative)
      : undefined;

    const outputRoot = path.join(packageRoot, outputFolder);
    const outputEntry = path.join(outputRoot, 'index.js');

    let outputTypes: string | undefined;

    if (sourceTypes && (await fse.pathExists(sourceTypes))) {
      outputTypes = await copyTypesForCjsExport({
        packageRoot,
        sourceTypes,
        outputRoot,
      });
    }

    await fse.ensureDir(outputRoot);

    if (options.force || !(await fse.pathExists(outputEntry))) {
      const esbuildImportName = 'esbuild';
      const esbuild = await import(esbuildImportName);
      await esbuild.build({
        entryPoints: [sourceEntry],
        outfile: outputEntry,
        external: ['node:*'],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: options.target ?? 'node18',

        sourcemap: true,
        packages: 'bundle',
        logLevel: 'info',

        ...options.esbuildOptions,

        // These must stay controlled by this function.
        // @ts-ignore
        entryPoints: [sourceEntry],
        // @ts-ignore
        outfile: outputEntry,
        // @ts-ignore
        format: 'cjs',
      });
    }

    packageJson.exports = addSubpathExport(packageJson.exports, exportSubpath, {
      ...(outputTypes
        ? {
            types: toPackageJsonPath(path.relative(packageRoot, outputTypes)),
          }
        : {}),
      require: toPackageJsonPath(path.relative(packageRoot, outputEntry)),
      default: toPackageJsonPath(path.relative(packageRoot, outputEntry)),
    });

    // const indent = detectJsonIndent(packageJsonContent);

    UtilsFilesFoldersSync.writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
    );

    UtilsFilesFoldersSync.writeFile(
      packageJsonCjsPath,
      JSON.stringify(
        {
          name: packageJson.name,
          version: packageJson.version,
          typings: packageJson.typings,
          exports: {
            './package.json': {
              default: './package.json',
            },
            '.': {
              types: packageJson.typings,
              default: './index.js',
              require: './index.js',
            },
          },
        },
        null,
        2,
      ),
    );

    //#endregion
  }
  //#endregion

  //#region package json types

  interface PackageJsonLike {
    name?: string;
    type?: string;
    main?: string;
    module?: string;
    types?: string;
    typings?: string;
    exports?: PackageExportValue | PackageSubpathExports;
    [key: string]: unknown;
  }

  type PackageExportValue =
    | string
    | null
    | PackageExportValue[]
    | {
        [condition: string]: PackageExportValue;
      };

  interface PackageSubpathExports {
    [subpath: string]: PackageExportValue;
  }

  //#endregion

  //#region export resolution

  function getRootExport(
    exportsField: PackageJsonLike['exports'],
  ): PackageExportValue | undefined {
    //#region @backendFunc
    if (exportsField === undefined) {
      return undefined;
    }

    if (
      typeof exportsField === 'string' ||
      exportsField === null ||
      Array.isArray(exportsField)
    ) {
      return exportsField;
    }

    const keys = Object.keys(exportsField);

    const isSubpathExports = keys.some(key => key.startsWith('.'));

    if (isSubpathExports) {
      return exportsField['.'];
    }

    // Conditional root export:
    //
    // {
    //   "types": "./types/index.d.ts",
    //   "import": "./index.js"
    // }
    return exportsField;
    //#endregion
  }

  function findConditionalPath(
    value: PackageExportValue | undefined,
    preferredConditions: string[],
  ): string | undefined {
    //#region @backendFunc
    if (typeof value === 'string') {
      return value;
    }

    if (!value) {
      return undefined;
    }

    if (Array.isArray(value)) {
      for (const entry of value) {
        const result = findConditionalPath(entry, preferredConditions);

        if (result) {
          return result;
        }
      }

      return undefined;
    }

    for (const condition of preferredConditions) {
      if (!(condition in value)) {
        continue;
      }

      const result = findConditionalPath(value[condition], preferredConditions);

      if (result) {
        return result;
      }
    }

    /*
     * Last-resort traversal for packages with custom conditions.
     */
    for (const child of Object.values(value)) {
      const result = findConditionalPath(child, preferredConditions);

      if (result) {
        return result;
      }
    }

    return undefined;
    //#endregion
  }

  function addSubpathExport(
    currentExports: PackageJsonLike['exports'],
    exportSubpath: string,
    newExport: PackageExportValue,
  ): PackageSubpathExports {
    //#region @backendFunc
    const normalizedSubpath = exportSubpath.startsWith('./')
      ? exportSubpath
      : `./${exportSubpath}`;

    if (currentExports === undefined) {
      return {
        [normalizedSubpath]: newExport,
      };
    }

    if (
      typeof currentExports === 'string' ||
      currentExports === null ||
      Array.isArray(currentExports)
    ) {
      return {
        '.': currentExports,
        [normalizedSubpath]: newExport,
      };
    }

    const keys = Object.keys(currentExports);
    const isAlreadySubpathMap = keys.some(key => key.startsWith('.'));

    if (isAlreadySubpathMap) {
      return {
        ...currentExports,
        [normalizedSubpath]: newExport,
      };
    }

    /*
     * Existing exports is a root conditional export:
     *
     * {
     *   "types": "...",
     *   "default": "..."
     * }
     *
     * It must become:
     *
     * {
     *   ".": {
     *     "types": "...",
     *     "default": "..."
     *   },
     *   "./cjs": {...}
     * }
     */
    return {
      '.': currentExports,
      [normalizedSubpath]: newExport,
    };
    //#endregion
  }

  //#endregion

  //#region types copying

  async function copyTypesForCjsExport(options: {
    packageRoot: string;
    sourceTypes: string;
    outputRoot: string;
  }): Promise<string> {
    //#region @backendFunc
    const { packageRoot, sourceTypes, outputRoot } = options;

    const sourceTypesDir = path.dirname(sourceTypes);
    const sourceTypesFileName = path.basename(sourceTypes);

    const outputTypesRoot = path.join(outputRoot, 'types');

    /*
     * Copy the whole directory, not only the entry .d.ts.
     *
     * This preserves relative imports such as:
     *
     * import { Something } from './internal';
     */
    await fse.remove(outputTypesRoot);
    await fse.copy(sourceTypesDir, outputTypesRoot, {
      overwrite: true,
      errorOnExist: false,
    });

    const copiedTypesEntry = path.join(outputTypesRoot, sourceTypesFileName);

    if (!(await fse.pathExists(copiedTypesEntry))) {
      throw new Error(
        `Type declaration copy failed. Expected file does not exist: ` +
          copiedTypesEntry,
      );
    }

    /*
     * Protect against a strange package configuration where its declared
     * types are outside its package root.
     */
    assertInsideDirectory(packageRoot, sourceTypes);

    return copiedTypesEntry;
    //#endregion
  }

  //#endregion

  //#region paths

  function resolveInsidePackage(
    packageRoot: string,
    packageRelativePath: string,
  ): string {
    //#region @backendFunc
    const cleaned = packageRelativePath.replace(/^\.\//, '');

    const result = path.resolve(packageRoot, cleaned);

    assertInsideDirectory(packageRoot, result);

    return result;
    //#endregion
  }

  function assertInsideDirectory(
    parentDirectory: string,
    targetPath: string,
  ): void {
    //#region @backendFunc
    const relative = path.relative(parentDirectory, targetPath);

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(
        `Resolved path escapes package directory:\n` +
          `Package: ${parentDirectory}\n` +
          `Target: ${targetPath}`,
      );
    }
    //#endregion
  }

  function normalizeRelativePath(value: string): string {
    //#region @backendFunc
    const normalized = value
      .replace(/\\/g, '/')
      .replace(/^\.?\//, '')
      .replace(/\/+$/, '');

    if (!normalized) {
      throw new Error('CJS output folder cannot be empty.');
    }

    if (normalized === '..' || normalized.startsWith('../')) {
      throw new Error(
        `CJS output folder must stay inside the package: ${value}`,
      );
    }

    return normalized;
    //#endregion
  }

  function toPackageJsonPath(value: string): string {
    //#region @backendFunc
    const normalized = value.replace(/\\/g, '/');

    return normalized.startsWith('./') ? normalized : `./${normalized}`;
    //#endregion
  }

  function detectJsonIndent(content: string): string | number {
    //#region @backendFunc
    const match = content.match(/^[ \t]+(?="[^"]+"\s*:)/m);

    return match?.[0] ?? 2;
    //#endregion
  }

  //#endregion
}
