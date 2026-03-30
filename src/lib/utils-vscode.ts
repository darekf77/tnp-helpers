//#region imports
import { ChildProcess, StdioOptions } from 'node:child_process';
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'; // @backend
import { promisify } from 'node:util'; // @backend

import * as ncp from 'copy-paste'; // @backend
import * as semver from 'semver'; // @backend
import * as sloc from 'sloc'; // @backend
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

import { BaseProject } from './base/classes/base-project';
import { HelpersTaon } from './helpers/helpers';
import {
  applicationConfigTemplate,
  ngMergeConfigTemplate,
  serverNgPartTemplates,
} from './utils-helpers/application-config-template';
//#endregion

//#region utils vscode
export namespace UtilsVSCode {
  //#region calculate contrast hex color
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
  //#endregion

  //#region  Convert HSL to HEX if you need HEX output
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
  //#endregion

  export const vscodeImport = () => {
    //#region @backendFunc
    if (!UtilsOs.isRunningInVscodeExtension()) {
      return {} as typeof vscodeType;
    }
    const vscode = require('vsc' + 'ode');
    return vscode as typeof vscodeType;
    //#endregion
  };

  //#region utils os / open folder in vscode
  export const openFolder = async (
    folderAbsPath: string | string[],
    editor?: UtilsOs.Editor,
  ): Promise<void> => {
    //#region @backendFunc
    folderAbsPath = crossPlatformPath(folderAbsPath);
    editor =
      editor ||
      UtilsOs.detectEditor() ||
      (await BaseProject.ins.configDb.codeEditor.getValue());

    if (!Helpers.exists(folderAbsPath)) {
      Helpers.warn(
        `Folder ${folderAbsPath} does not exists. Nothing to open.`,
        true,
      );
      return;
    }

    if (!Helpers.isFolder(folderAbsPath)) {
      Helpers.warn(`Can't open file as folder`, true);
      await UtilsVSCode.openFile(folderAbsPath);
      return;
    }

    Helpers.taskStarted(`Opening folder in VSCode: "${folderAbsPath}"`);
    try {
      Helpers.run(`${editor} .`, {
        cwd: folderAbsPath,
        silence: true,
        output: false,
      }).sync();
      Helpers.taskDone(`Done opening folder in VSCode: "${folderAbsPath}"`);
    } catch (error) {
      Helpers.warn(`Not able to open in VSCode: "${folderAbsPath}"`, false);
    }
    //#endregion
  };
  //#endregion

  //#region utils os / open folder in vscode
  export const openFile = async (
    fileAbsPath: string | string[],
    options?: {
      editor?: UtilsOs.Editor;
      specyficLine?: number;
    },
  ): Promise<void> => {
    //#region @backendFunc
    fileAbsPath = crossPlatformPath(fileAbsPath);
    options = options || {};
    let { editor, specyficLine } = options;
    editor =
      editor ||
      UtilsOs.detectEditor() ||
      (await BaseProject.ins.configDb.codeEditor.getValue());

    if (!Helpers.exists(fileAbsPath)) {
      Helpers.warn(
        `File ${fileAbsPath} does not exists. Nothing to open.`,
        true,
      );
      return;
    }

    if (Helpers.isFolder(fileAbsPath)) {
      Helpers.warn(`Can't open folder as file`, true);
      await UtilsVSCode.openFolder(fileAbsPath, options.editor);
      return;
    }

    Helpers.taskStarted(`Opening file in VSCode: "${fileAbsPath}"`);
    try {
      Helpers.run(
        `${editor} ${specyficLine ? '--goto' : ''} ${fileAbsPath}${specyficLine ? `:${specyficLine}:1` : ''}`,
        {
          cwd: process.cwd(),
          silence: true,
          output: false,
        },
      ).sync();
      Helpers.taskDone(`Done opening file in VSCode: "${fileAbsPath}"`);
    } catch (error) {
      Helpers.warn(`Not able to open file in VSCode: "${fileAbsPath}"`, false);
    }
    //#endregion
  };
  //#endregion

  //#region regeberate vscode setting
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
  //#endregion

  //#region get extensions

  export const commonRecommededExtensionsExtensions = (): string[] => {
    return [
      'taon-dev.taon',
      'EditorConfig.EditorConfig',
      'IBM.output-colorizer',
      'Mikael.Angular-BeastCode',
      // 'Angular.ng-template',
      'sndst00m.vscode-native-svg-preview', // 'SimonSiefke.svg-preview',
      'HansUXdev.bootstrap5-snippets', // 'Zaczero.bootstrap-v4-snippets', 'wcwhitehead.bootstrap-3-snippets', // very old
      'alefragnani.Bookmarks',
      'amodio.toggle-excluded-files',
      'ctcuff.font-preview',
      'dbaeumer.vscode-eslint',
      'dnicolson.binary-plist',
      'eamodio.gitlens', // very nice inline git blame
      'esbenp.prettier-vscode',
      'johnpapa.Angular2',
      'marclipovsky.string-manipulation',

      'thebearingedge.vscode-sql-lit', // SQL templates extensions
      'keyshout.sqlite-db-viewer', // free version of qwtel.sqlite-viewer - no writes
      'christian-kohler.path-intellisense', // asset pathes autocomplete
      'redhat.vscode-xml',
      'rogalmic.bash-debug',
      'Gruntfuggly.todo-tree',
      'saber2pr.file-git-history',
      'unifiedjs.vscode-mdx',
      'Malo.copy-json-path',
      'aaron-bond.better-comments',
      'mikestead.dotenv',
      'humao.rest-client',
      'hediet.vscode-drawio',
      'tomoki1207.pdf',
      'streetsidesoftware.code-spell-checker',
      'Tyriar.sort-lines',
      'DavidAnson.vscode-markdownlint',
      'wmaurer.change-case',
      'earshinov.permute-lines',
      'xabikos.javascriptsnippets',
      //  'mechatroner.rainbow-csv',
      // 'wenfangdu.snippet-generator', snippet generator
      //#region  to check
      // 'abumalick.vscode-nvm', // test this before
      // , // there is prettiers

      // 'alexdima.copy-relative-path', // already in taon
      // 'alexiv.vscode-angular2-files', // taon generator is better

      // , // no needed anymore (embeded in taon)

      // 'eg2.tslint',

      // 'henry-li.vscode-import-formatter', not neede - eslint does it
      // 'jack89ita.copy-filename', // in taon

      // 'momoko8443.library-version',

      // 'oven.bun-vscode', // errors in vscode cosole
      // 'qwtel.sqlite-viewer', // 80$ not free

      // , already in taon

      // 'taddison.gitlazy',

      // 'vespa-dev-works.jestrunit',

      // 'wmaurer.vscode-jumpy', // nice but I am not using it

      // 'usernamehw.errorlens', nice extension.. but to much input at once

      // 'pranaygp.vscode-css-peek', // high cpu usage
      // 'bengreenier.vscode-node-readme',
      // 'kisstkondoros.vscode-codemetrics', // TOO MUCH CPU USAGE
      // 'vscode-icons-team.vscode-icons',

      // TODO nesting is so nice.. but I nee to modify it for taon
      // 'antfu.file-nesting',

      // 'frigus02.vscode-sql-tagged-template-literals', TODO CHECK
      // 'frigus02.vscode-sql-tagged-template-literals-syntax-only', TODO CHECK
      // -------
      // 'mihelcic.colored-regions', TODO I need modified version for taon
      // 'shardulm94.trailing-spaces',

      //  'bierner.color-info', // nice to have color info in css/scss files
      // ---
      // 'skacekachna.win-opacity',
      // 'electrotype.windows-explorer-context-menu',
      // escape win path on paset TODO CHECK THIS
      // 'coalaura.win-path',

      // nice extension but not use for now in taon
      // csv thing
      //
      //#endregion
    ];
  };

  export const codiumExtensions = (): string[] => {
    return [
      'Alexanderius.language-hosts',
      'jellydn.toggle-excluded-files', // for of 'amodio.toggle-excluded-files',
      ...commonRecommededExtensionsExtensions(),
    ];
  };
  export const codeExtensions = (): string[] => {
    // wenfangdu.faster-new new file folder for codium
    return Utils.uniqArray([
      ...commonRecommededExtensionsExtensions(),
      'tommasov.hosts',
      'amodio.toggle-excluded-files',
      //#region @backend
      // 'GitHub.copilot', => deprecated
      // 'GitHub.copilot-chat',

      //#region  TODO  find alternative FOR codium

      'mariusalchimavicius.json-to-ts',
      'natewallace.angular2-inline',

      'tshino.kb-macro', // nice macros

      //#endregion

      //#endregion
    ]).map(c => (c as string).toLowerCase());
  };
  //#endregion

  export const vscodeExtensions = (editor?: UtilsOs.Editor): string[] => {
    editor = editor ? editor : UtilsOs.detectEditor();
    if (editor === 'code') {
      return codeExtensions();
    }
    return codiumExtensions();
  };

  //#region get deprecated extensions
  export const getDeprecatedExtension = (editor?: UtilsOs.Editor): string[] => {
    return [
      'ms-azuretools.vscode-containers',
      'ms-azuretools.vscode-docker',
      'bibhasdn.unique-lines',
      'ms-vscode-remote.remote-ssh',
      'scrapecrow.html-escape',
      'marinhobrandao.angular2tests', // snipperts for test
      'cg-cnu.vscode-path-tools',
      'chrisdias.vscode-opennewinstance',
      'aeschli.vscode-css-formatter',
      'rssowl.copy-relative-path-posix',
      'ms-vscode-remote.remote-containers',
      'ms-azuretools.vscode-docker',
      'waderyan.gitblame',
      'ryu1kn.partial-diff',
      'nidu.copy-json-path',
      'firsttris.vscode-jest-runner', // better for jest TODO include this for TAON
      'franklinteixeira205.primeflex',
      'stepanog.angular1-inline',
      'shakram02.bash-beautify',
      'ryanlaws.toggle-case',
      'ritwickdey.create-file-folder',
      'ms-vscode-remote.remote-wsl',
      'kgrzywocz.wsl-path',
      'imgildev.vscode-angular-generator',
      'nemesv.copy-file-name',
      'natqe.reload', // in taon
      'ms-vscode.live-server', // not needed
      'msjsdiag.debugger-for-chrome', // old
      'mikebovenlander.formate', // prettier
      'mrmlnc.vscode-json5', // prettier
      'jack89ita.copy-filename', // in taon
      'eg2.tslint', // old
      'rssowl.copy-relative-path-posix', // in taon
      'alexdima.copy-relative-path', // in taon
      'ivangabriele.vscode-git-add-and-commit', // in taon
      'alexiv.vscode-angular2-files', // in taon
      'taddison.gitlazy', // in taon
    ];
  };
  //#endregion

  //#region strip version
  /**
   * This pattern finds a dash followed by at least one digit.
   * It removes everything from that dash to the end of the string.
   * Examples:
   * "name-of-extension-1.2.3" -> "name-of-extension"
   * "extension-0.9.5-win32-x64" -> "extension"
   */
  export const stripVersion = (folderName: string): string => {
    return folderName.replace(/(-\d+.*)$/, '');
  };
  //#endregion

  //#region install extensions
  export const removeDeprecated = async (options?: {
    editor?: UtilsOs.Editor;
  }) => {
    options = options || {};
    options.editor = UtilsOs.detectEditor();

    const deprecated = getDeprecatedExtension(options.editor);
    // console.log({ deprecated });
    // HelpersTaon.pressKeyOrWait('Press any key to continue...');
    for (let index = 0; index < deprecated.length; index++) {
      const extname = deprecated[index];
      try {
        Helpers.taskStarted(`Uninstalling: ${extname}`);
        Helpers.run(
          `${options.editor} --uninstall-extension  ${extname}`,
        ).sync();
        Helpers.taskDone(`Removed ${extname} done.`);
        await Utils.wait(1);
      } catch (error) {
        // console.error(error);
        Helpers.warn(`Not able to uninstall ${extname}`);
        // await UtilsTerminal.pressAnyKeyToContinueAsync({
        //   message: 'Press any key to continue...',
        // });
      }
    }
  };

  export const installAndRemoveDeprecatedExtensions = async (options?: {
    defaultSelectedAll?: boolean;
    editor?: UtilsOs.Editor;
    extensions?: string[];
  }): Promise<void> => {
    await installExtensions(options);
    await removeDeprecated(options);
  };

  export const installExtensions = async (options?: {
    defaultSelectedAll?: boolean;
    editor?: UtilsOs.Editor;
    extensions?: string[];
  }): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    options.editor = UtilsOs.detectEditor();
    options.extensions =
      options.extensions || UtilsVSCode.vscodeExtensions(options?.editor);
    let extensions = options.extensions;
    const defaultSelectedAll = !!options.defaultSelectedAll;
    // console.log({ extensions });
    // const alreadyInstalled = UtilsVSCode.installedExtensions();
    // Helpers.info(
    //   `There are over all ${extensions.length} recommended extensions.`,
    // );
    // const alreadyInstalledNames = extensions.filter(ext =>
    //   alreadyInstalled.includes(ext),
    // );
    // extensions = extensions.filter(ext => !alreadyInstalled.includes(ext));

    const menuItems = extensions.map(r => {
      return { name: r, value: r, enabled: true, selected: true };
    });

    // Helpers.info(
    //   `Already installed from list ` +
    //     ` (${alreadyInstalledNames.length} extensions): `,
    // );
    // console.log(`${alreadyInstalledNames.join(', ')}`);
    // console.log(
    //   `Extensions to install: ${extensions.recommendations.join(', ')}`,
    // );
    let extensionsToInstall = [];

    Helpers.info(`There are ${extensions.length} extensions to install`);

    extensionsToInstall = await UtilsTerminal.multiselect({
      choices: menuItems,
      question: `Select extensions to install`,
      autocomplete: true,
      defaultSelected: defaultSelectedAll ? menuItems.map(m => m.value) : [],
    });
    Helpers.info(extensionsToInstall.join(', '));

    if (
      !(await UtilsTerminal.confirm({
        message: 'Proceed with installation?',
      }))
    ) {
      return;
    }

    for (let index = 0; index < extensionsToInstall.length; index++) {
      const extname = extensionsToInstall[index];
      try {
        Helpers.taskStarted(`Installing: ${extname}`);
        Helpers.run(`${options.editor} --install-extension ${extname}`).sync();
        Helpers.taskDone(`Installed: ${extname}`);
      } catch (error) {
        Helpers.warn(`Not able to install ${extname}`);
        HelpersTaon.pressKeyOrWait('Press any key to continue...');
      }
    }
    Helpers.info('Done installing');
    //#endregion
  };
  //#endregion

  //#region installed extensions
  /**
   * @deprecated
   */
  export const installedExtensions = (): string[] => {
    //#region @backendFunc
    /**
     * Removes trailing version/OS tags from folder names:
     *  e.g. "mariusalchimavicius.json-to-ts-1.8.0" -> "mariusalchimavicius.json-to-ts"
     */

    // Adjust the folder path as needed (Insiders, etc.)
    const extensionsPath = crossPlatformPath([
      UtilsOs.getRealHomeDir(),
      '.vscode',
      'extensions',
    ]);

    if (!fse.existsSync(extensionsPath)) {
      console.error('Extensions directory not found:', extensionsPath);
      return [];
    }

    // Read directory contents
    const items = fse.readdirSync(extensionsPath, { withFileTypes: true });

    // Filter directories and strip version
    const extensions = items
      .filter(item => item.isDirectory() && !item.name.startsWith('.'))
      .map(folder => stripVersion(folder.name));

    return Utils.uniqArray(extensions).map(c => (c as string).toLowerCase());
    //#endregion
  };
  //#endregion

  //#region apply proper global settings
  export const applyProperGlobalSettings = async (options?: {
    editor?: UtilsOs.Editor;
  }): Promise<void> => {
    //#region @backendFunc
    options = options || {};
    options.editor = options.editor || UtilsOs.detectEditor();
    const keybindingPathLinux = path.join(
      crossPlatformPath(os.userInfo().homedir),
      '.config/Code/User/keybindings.json',
    );
    const keybindingPathMacOS = path.join(
      crossPlatformPath(os.userInfo().homedir),
      `Library/Application Support/Code/User/keybindings.json`,
    );
    const keybindingPathWindows = path.join(
      crossPlatformPath(os.userInfo().homedir),
      'AppData/Roaming/Code/User/keybindings.json',
    );

    const taonBuildTask = [
      {
        key: 'shift+cmd+c',
        command: 'extension.taonstopdefaultbuild',
      },
      {
        key: 'shift+cmd+b',
        command: 'extension.taonrundefaultbuild',
      },
    ];

    const commonKeybindings = [
      {
        key: 'shift+alt+d',
        command: 'eslint.executeAutofix',
      },

      //#region macros start stop replay
      {
        key: 'ctrl+oem_1',
        command: 'kb-macro.startRecording',
        when: "!kb-macro.recording && config.keyboardMacro.recordingShortcuts == 'Option1'",
      },
      {
        key: 'ctrl+alt+r',
        command: '-kb-macro.startRecording',
        when: "!kb-macro.recording && config.keyboardMacro.recordingShortcuts == 'Option1'",
      },
      {
        key: 'ctrl+oem_1',
        command: 'kb-macro.finishRecording',
        when: "kb-macro.recording && config.keyboardMacro.recordingShortcuts == 'Option1'",
      },
      {
        key: 'ctrl+alt+r',
        command: '-kb-macro.finishRecording',
        when: "kb-macro.recording && config.keyboardMacro.recordingShortcuts == 'Option1'",
      },
      {
        key: 'ctrl+shift+oem_1',
        command: 'kb-macro.playback',
        when: "!kb-macro.recording && config.keyboardMacro.recordingShortcuts == 'Option1'",
      },
      {
        key: 'ctrl+alt+p',
        command: '-kb-macro.playback',
        when: "!kb-macro.recording && config.keyboardMacro.recordingShortcuts == 'Option1'",
      },
      //#endregion
    ];

    //#region global / keybindings macos
    const keysMac = [
      {
        key: 'shift+cmd+s',
        command: 'workbench.action.files.saveAll',
      },
      {
        key: 'alt+cmd+s',
        command: '-workbench.action.files.saveAll',
      },
      {
        key: 'shift+cmd+z',
        command: 'default:redo',
      },
      {
        key: 'alt+d',
        command: 'workbench.action.debug.start',
        when: "debuggersAvailable && debugState == 'inactive'",
      },
      {
        key: 'f5',
        command: '-workbench.action.debug.start',
        when: "debuggersAvailable && debugState == 'inactive'",
      },
      ...commonKeybindings,
    ];
    //#endregion

    //#region global / keybindings windows
    const keysWindows = [
      {
        key: 'shift+ctrl+s',
        command: 'workbench.action.files.saveAll',
      },
      {
        key: 'alt+ctrl+s',
        command: '-workbench.action.files.saveAll',
      },
      {
        key: 'ctrl+shift+s',
        command: 'saveAll',
      },
      {
        key: 'ctrl+k s',
        command: '-saveAll',
      },
      {
        key: 'alt+d',
        command: 'workbench.action.debug.start',
        when: "debuggersAvailable && debugState == 'inactive'",
      },
      {
        key: 'f5',
        command: '-workbench.action.debug.start',
        when: "debuggersAvailable && debugState == 'inactive'",
      },
      {
        key: 'shift+ctrl+z',
        command: 'default:redo',
      },
      {
        key: 'shift+alt+d',
        command: 'eslint.executeAutofix',
      },
      ...commonKeybindings,
    ];
    //#endregion

    //#region global / keybindings linux
    const keysLinux = [
      ...keysWindows,
      {
        key: 'shift+alt+f',
        command: '-filesExplorer.findInFolder',
        when: 'explorerResourceIsFolder && explorerViewletVisible && filesExplorerFocus && !inputFocus',
      },
      {
        key: 'shift+alt+f',
        command: 'editor.action.formatDocument',
        when: 'editorHasDocumentFormattingProvider && editorTextFocus && !editorReadonly && !inCompositeEditor',
      },
      {
        key: 'ctrl+shift+i',
        command: '-editor.action.formatDocument',
        when: 'editorHasDocumentFormattingProvider && editorTextFocus && !editorReadonly && !inCompositeEditor',
      },
      {
        key: 'ctrl+c',
        command: 'workbench.action.terminal.copySelection',
        when: 'terminalTextSelectedInFocused || terminalFocus && terminalHasBeenCreated && terminalTextSelected || terminalFocus && terminalProcessSupported && terminalTextSelected || terminalFocus && terminalTextSelected && terminalTextSelectedInFocused || terminalHasBeenCreated && terminalTextSelected && terminalTextSelectedInFocused || terminalProcessSupported && terminalTextSelected && terminalTextSelectedInFocused',
      },
      {
        key: 'ctrl+shift+c',
        command: '-workbench.action.terminal.copySelection',
        when: 'terminalTextSelectedInFocused || terminalFocus && terminalHasBeenCreated && terminalTextSelected || terminalFocus && terminalProcessSupported && terminalTextSelected || terminalFocus && terminalTextSelected && terminalTextSelectedInFocused || terminalHasBeenCreated && terminalTextSelected && terminalTextSelectedInFocused || terminalProcessSupported && terminalTextSelected && terminalTextSelectedInFocused',
      },
      {
        key: 'ctrl+v',
        command: 'workbench.action.terminal.paste',
        when: 'terminalFocus && terminalHasBeenCreated || terminalFocus && terminalProcessSupported',
      },
      {
        key: 'ctrl+shift+v',
        command: '-workbench.action.terminal.paste',
        when: 'terminalFocus && terminalHasBeenCreated || terminalFocus && terminalProcessSupported',
      },
    ];
    //#endregion

    if (process.platform === 'win32') {
      Helpers.writeFile(keybindingPathWindows, keysWindows);
    } else if (process.platform === 'linux') {
      Helpers.writeFile(keybindingPathLinux, keysLinux);
    } else if (process.platform === 'darwin') {
      Helpers.writeFile(keybindingPathMacOS, keysMac);
    }

    //#region global / windows only settings
    const windowsSettings = {
      'terminal.integrated.profiles.windows': {
        'PowerShell Core': {
          path: `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe`,
        },
      },
      'terminal.integrated.defaultProfile.windows': 'Git Bash',
      'terminal.integrated.shellArgs.windows': ['--login'],
      'window.customMenuBarAltFocus': false,
      'window.enableMenuBarMnemonics': false,
      'terminal.integrated.rightClickBehavior': 'selectWord',
    };
    //#endregion

    //#region global / macos only settings
    const settingsMacOS = {
      'terminal.integrated.shell.osx': '/bin/bash',
    };
    //#endregion

    const settingsLinux = {
      // proper alt behavior for vscode on linux
      'window.titleBarStyle': 'custom',
      'window.customMenuBarAltFocus': false,
      'window.enableMenuBarMnemonics': false,
    };

    //#region global / setting for all

    let settings = {
      // 'scm.showIncomingChanges': false,
      // 'scm.showOutgoingChanges': false,
      'workbench.layoutControl.enabled': false,
      'typescript.updateImportsOnPaste.enabled': false,
      'editor.pasteAs.enabled': false,
      'scm.showHistoryGraph': false,
      'scm.showActionButton': false,
      'editor.renderWhitespace': true,
      'window.commandCenter': false,
      'window.zoomPerWindow': false,
      'git.enableSmartCommit': true,
      'terminal.integrated.scrollback': 10000,
      // 'files.insertFinalNewline': true,
      'html.format.endWithNewline': true,
      'html.format.wrapAttributes': 'force-aligned',
      'files.hotExit': 'onExitAndWindowClose',
      'typescript.referencesCodeLens.enabled': true,
      'git.autoRepositoryDetection': false,
      // Whether auto fetching is enabled.
      'git.autofetch': false,
      'gitlens.keymap': 'none',
      'gitlens.advanced.messages': {
        suppressCommitHasNoPreviousCommitWarning: false,
        suppressCommitNotFoundWarning: false,
        suppressFileNotUnderSourceControlWarning: false,
        suppressGitVersionWarning: false,
        suppressLineUncommittedWarning: false,
        suppressNoRepositoryWarning: false,
        suppressResultsExplorerNotice: false,
        suppressShowKeyBindingsNotice: true,
      },
      'search.followSymlinks': false,
      'javascript.implicitProjectConfig.experimentalDecorators': true,
      'js/ts.implicitProjectConfig.experimentalDecorators': true,
      'gitlens.historyExplorer.enabled': true,
      'diffEditor.ignoreTrimWhitespace': true,
      'explorer.confirmDelete': false,
      'typescript.updateImportsOnFileMove.enabled': 'never',
      'javascript.updateImportsOnFileMove.enabled': 'never',
      'window.restoreWindows': 'one', // all sucks
      'search.searchOnType': false,
      'scm.alwaysShowProviders': false,
      'breadcrumbs.enabled': true,
      'extensions.ignoreRecommendations': true,
      'git.showProgress': true,
      'debug.node.showUseWslIsDeprecatedWarning': false,
      'explorer.compactFolders': false,
      'workbench.colorTheme': 'Default Light+',
      'update.mode': 'none',
      'debug.onTaskErrors': 'abort',
      'editor.wordBasedSuggestions': false,
      'typescript.tsdk': 'node_modules/typescript/lib',
      /**
       * terminal tabs quick switcher (actually good idea)
       */
      'terminal.integrated.tabs.enabled': false,
      'workbench.editor.enablePreview': true,
      'security.workspace.trust.banner': 'never',
      'telemetry.enableTelemetry': false,
      'security.workspace.trust.enabled': false,
      'terminal.integrated.enableMultiLinePasteWarning': false,
      'git.detectSubmodules': false,
      'editor.wordBasedSuggestionswordBasedSuggestions': false,
      'git.openRepositoryInParentFolders': 'never',
      'redhat.telemetry.enabled': false,
      'editor.accessibilitySupport': 'off',
      'editor.minimap.enabled': true,
      'editor.stickyScroll.enabled': false,
      'editor.minimap.showMarkSectionHeaders': false,
      'editor.minimap.showRegionSectionHeaders': false,
      'prettier.endOfLine': 'auto',
      'eslint.format.enable': true,
      '[json]': {
        'editor.defaultFormatter': 'vscode.json-language-features',
      },
      '[typescript]': {
        'editor.defaultFormatter': 'vscode.typescript-language-features',
        // 'editor.foldingStrategy': 'auto',
        // 'editor.foldingImportsByDefault': true,
        // 'editor.folding': true,
        // 'editor.foldingInitialLevel': 10,
      },
      '[jsonc]': {
        'editor.defaultFormatter': 'vscode.json-language-features',
      },
      '[javascript]': {
        'editor.defaultFormatter': 'vscode.typescript-language-features',
      },
      '[css]': {
        'editor.defaultFormatter': 'vscode.typescript-language-features',
      },
      '[scss]': {
        'editor.defaultFormatter': 'vscode.typescript-language-features',
      },
      'cSpell.userWords': [
        'end' + 'region',
        'base' + 'class',
        'Taon',
        'websql',
        'type' + 'orm',
        'mat' + 'ero',
        'St' + 'der',
        're' + 'init',
        'git' + 'bash',
        'Try' + 's',
        'port' + 'finder',
        'ngrx',
        'nocheck',
        'dockerization',
        'matero',
        'portfinder',
        'Rebuilder',
        'reinit',
        'Stder',
        'Taon',
        'traefik',
        'Trys',
        'typeorm',
        'websql',
        'mkdocs',
        'Initing',
        'traefik',
        'Zscaller',
        'formly',
      ],
      'cSpell.diagnosticLevel': 'Hint',
      'cSpell.enabledNotifications': {
        'Maximum Word Length Exceeded': false,
      },
      'docker.extension.dockerEngineAvailabilityPrompt': false,
      'chat.commandCenter.enabled': false,
      'terminal.integrated.stickyScroll.enabled': false,
      'vsicons.dontShowNewVersionMessage': true,
      // disable intro AI panel
      'chat.editor.open': 'never',
      'chat.editor.experimental.introPanel': false,
      'chat.welcome.show': false,
      'workbench.secondarySideBar.defaultVisibility': 'hidden',
      'http.proxyStrictSSL': false,
      'telemetry.telemetryLevel': 'off',
      // github copilot settings
      'github.copilot.search.enable': false,
      'github.copilot.chat.search.semanticTextResults': false,
      'editor.inlineSuggest.enabled': true,
      'editor.inlineSuggest.showToolbar': 'never',
      'editor.inlineSuggest.suppressSuggestions': false,
      'github.copilot.suggestionDelay': 75,
      'github.copilot.chat.enabled': false,
      'editor.semanticHighlighting.enabled': false,
      'editor.tokenColorCustomizations': {
        textMateRules: [
          {
            scope: 'meta.inline.completion',
            settings: {
              foreground: '#7a7a7a',
              fontStyle: 'italic',
            },
          },
        ],
      },
    };
    //#endregion

    //#region global / settings paths
    const settingsPath = UtilsOs.getEditorSettingsJsonPath(options.editor);

    if (process.platform === 'darwin') {
      settings = _.merge(settings, settingsMacOS);
    }
    if (process.platform === 'win32') {
      settings = _.merge(settings, windowsSettings);
    }
    if (process.platform === 'linux') {
      settings = _.merge(settings, settingsLinux);
    }
    //#endregion

    if (!options.editor || !settingsPath) {
      Helpers.error(
        `Cannot detect editor to apply global settings! `,
        false,
        true,
      );
    }

    console.log(`Applying global settings to ${options.editor}
    settings.json file at:
     ${settingsPath}
  `);

    const dest = crossPlatformPath(settingsPath);
    Helpers.writeFile(dest, settings);
    Helpers.info(`Vscode configured !`);
    //#endregion
  };
  //#endregion
}

//#endregion
