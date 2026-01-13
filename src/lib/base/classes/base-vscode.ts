import {
  CoreModels,
  crossPlatformPath,
  fse,
  os,
  path,
  Utils,
  UtilsOs,
  UtilsTerminal,
} from 'tnp-core/src';
import { _ } from 'tnp-core/src';

import { Helpers, UtilsVSCode } from '../../index';

import { BaseFeatureForProject } from './base-feature-for-project';
import type { BaseProject } from './base-project';

export class BaseVscodeHelpers<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  //#region init
  async init(options?: { skipHiddingTempFiles?: boolean }): Promise<void> {
    options = options || {};
    this.recreateExtensions();
    await this.recreateBaseSettings();
    this.recreateWindowTitle();
    if (!options.skipHiddingTempFiles) {
      this.toogleFilesVisibilityInVscode({
        action: 'hide-files',
        skipSaving: true,
      });
    }
    this.saveCurrentSettings();
  }
  //#endregion

  //#region fields
  /**
   * settings.json relative path
   */
  public readonly relativePathSettingsJsonVscode = '.vscode/settings.json';
  public readonly relativePathExtensionJsonVScode = '.vscode/extensions.json';

  public readonly currentSettingsValue: CoreModels.VSCodeSettings;
  //#endregion

  //#region constructor
  constructor(project: PROJECT) {
    super(project);
    this.currentSettingsValue =
      Helpers.readJsonC(project.pathFor(this.relativePathSettingsJsonVscode)) ||
      {};
  }
  //#endregion

  //#region modify vscode settings
  protected modifyVscode(
    modifyFN: (
      settings: CoreModels.VSCodeSettings,
    ) => CoreModels.VSCodeSettings,
  ): void {
    //#region @backendFunc
    try {
      // @ts-ignore
      this.currentSettingsValue = modifyFN(this.currentSettingsValue);
    } catch (error) {
      console.log(error);
      Helpers.error(`Error during modifying vscode settings`, true, true);
    }
    //#endregion
  }
  //#endregion

  //#region save current settings
  public saveCurrentSettings(): void {
    //#region @backendFunc
    this.project.writeJsonC(
      this.relativePathSettingsJsonVscode,
      this.currentSettingsValue,
    );
    //#endregion
  }
  //#endregion

  //#region get extensions
  getExtensions(): string[] {
    return Helpers.uniqArray([
      //#region @backend
      // 'Angular.ng-template', // high cpu usage
      'EditorConfig.EditorConfig',
      // 'GitHub.copilot', => deprecated
      'GitHub.copilot-chat',
      'IBM.output-colorizer',
      'Mikael.Angular-BeastCode',
      'SimonSiefke.svg-preview',
      'Zaczero.bootstrap-v4-snippets',
      'wcwhitehead.bootstrap-3-snippets',
      // 'abumalick.vscode-nvm', // test this before
      'aeschli.vscode-css-formatter',
      'alefragnani.Bookmarks',
      'alexdima.copy-relative-path',
      // 'alexiv.vscode-angular2-files', // taon generator is better
      'amodio.toggle-excluded-files',
      'cg-cnu.vscode-path-tools',
      'chrisdias.vscode-opennewinstance',
      'ctcuff.font-preview',
      'dbaeumer.vscode-eslint',
      'dnicolson.binary-plist',
      'eamodio.gitlens', // very nice inline git blame
      'eg2.tslint',
      'esbenp.prettier-vscode',
      // 'henry-li.vscode-import-formatter', not neede - eslint does it
      'jack89ita.copy-filename',
      'johnpapa.Angular2',
      'marclipovsky.string-manipulation',
      'marinhobrandao.angular2tests',
      'mariusalchimavicius.json-to-ts',
      'maximus136.change-string-case',
      'mikebovenlander.formate',
      'momoko8443.library-version',
      'mrmlnc.vscode-json5',
      'ms-azuretools.vscode-docker',
      'ms-vscode.live-server',
      'msjsdiag.debugger-for-chrome',
      'natewallace.angular2-inline',
      'natqe.reload',
      'nemesv.copy-file-name',
      // 'oven.bun-vscode', // errors in vscode cosole
      'qwtel.sqlite-viewer',
      'redhat.vscode-xml',
      'ritwickdey.create-file-folder',
      'rogalmic.bash-debug',
      'rssowl.copy-relative-path-posix',
      'ryanlaws.toggle-case',
      'saber2pr.file-git-history',
      'shakram02.bash-beautify',
      'stepanog.angular1-inline',
      // 'taddison.gitlazy',
      'unifiedjs.vscode-mdx',
      'tommasov.hosts',
      'franklinteixeira205.primeflex',
      // 'vespa-dev-works.jestrunit',
      'firsttris.vscode-jest-runner', // better for jest
      // 'waderyan.gitblame',

      'wenfangdu.snippet-generator',
      'xabikos.javascriptsnippets',
      // 'wmaurer.vscode-jumpy', // nice but I am not using it
      'nidu.copy-json-path',
      'aaron-bond.better-comments',
      'mikestead.dotenv',
      'ryu1kn.partial-diff',
      'Tyriar.sort-lines',
      'ms-vscode-remote.remote-containers',
      'ms-azuretools.vscode-docker',
      'DavidAnson.vscode-markdownlint',
      'bibhasdn.unique-lines',
      'streetsidesoftware.code-spell-checker',
      'tshino.kb-macro', // nice macros
      // 'usernamehw.errorlens', nice extension.. but to much input at once

      // 'pranaygp.vscode-css-peek', // high cpu usage
      // 'bengreenier.vscode-node-readme',
      // 'kisstkondoros.vscode-codemetrics', // TOO MUCH CPU USAGE
      // 'vscode-icons-team.vscode-icons',
      'Gruntfuggly.todo-tree',
      'ms-vscode-remote.remote-ssh',
      'tomoki1207.pdf',
      'hediet.vscode-drawio',
      'humao.rest-client',
      // TODO nesting is so nice.. but I nee to modify it for taon
      // 'antfu.file-nesting',
      // TODO CHECK asset pathes autocomplete
      'christian-kohler.path-intellisense',
      // SQL templates extensions
      'thebearingedge.vscode-sql-lit',
      // 'frigus02.vscode-sql-tagged-template-literals', TODO CHECK
      // 'frigus02.vscode-sql-tagged-template-literals-syntax-only', TODO CHECK
      // -------
      // 'mihelcic.colored-regions', TODO I need modified version for taon
      // 'shardulm94.trailing-spaces',

      // wsl
      'ms-vscode-remote.remote-wsl',
      'kgrzywocz.wsl-path',
      'imgildev.vscode-angular-generator',
      // ---
      // 'skacekachna.win-opacity',
      // 'electrotype.windows-explorer-context-menu',
      // escape win path on paset TODO CHECK THIS
      // 'coalaura.win-path',

      // nice extension but not use for now in taon
      // csv thing
      // 'mechatroner.rainbow-csv',

      //#endregion
    ]).map(c => (c as string).toLowerCase());
  }
  //#endregion

  getDeprecatedExtension(): string[] {
    return [
      'ivangabriele.vscode-git-add-and-commit',
      'alexiv.vscode-angular2-files',
      'taddison.gitlazy',
      'xabikos.JavaScriptSnippets',
    ];
  }

  //#region extensions
  /**
   * @deprecated use getExtensions() instead
   */
  private get extensions(): string[] {
    return this.getExtensions();
  }
  //#endregion

  //#region recreate extensions
  recreateExtensions(): void {
    //#region @backendFunc
    this.project.writeFile(
      this.relativePathExtensionJsonVScode,
      JSON.stringify(
        {
          recommendations: this.extensions,
        },
        null,
        2,
      ),
    );
    //#endregion
  }
  //#endregion

  //#region recreate base settings
  protected getExecuteParamsForSettings(): any[] {
    return [this.project];
  }

  async recreateBaseSettings(options?: { save?: boolean }): Promise<void> {
    //#region @backendFunc
    options = options || {};
    options.save = !!options.save;
    const settings = await this.getBasicSettins();
    await this.resolveParamsVscode(
      settings,
      this.getExecuteParamsForSettings(),
    );
    _.merge(this.currentSettingsValue, settings);
    if (options.save) {
      this.saveCurrentSettings();
    }
    //#endregion
  }
  //#endregion

  //#region recraete window title
  recreateWindowTitle(options?: { save?: boolean }): void {
    //#region @backendFunc
    options = options || {};
    options.save = !!options.save;

    _.set(
      this.currentSettingsValue,
      '["window.title"]',
      this.project.titleBarName,
    );
    if (options.save) {
      this.saveCurrentSettings();
    }
    //#endregion
  }
  //#endregion

  //#region install extensions
  async installExtensions(
    extensions = this.extensions,
    defaultSelectedAll = false,
  ): Promise<void> {
    //#region @backendFunc
    // console.log({ extensions });
    const alreadyInstalled = this.installedExtensions;
    Helpers.info(
      `There are over all ${extensions.length} recommended extensions.`,
    );
    const alreadyInstalledNames = extensions.filter(ext =>
      alreadyInstalled.includes(ext),
    );
    extensions = extensions.filter(ext => !alreadyInstalled.includes(ext));

    const menuItems = extensions.map(r => {
      return { name: r, value: r, enabled: true, selected: true };
    });

    Helpers.info(
      `Already installed from list ` +
        ` (${alreadyInstalledNames.length} extensions): `,
    );
    console.log(`${alreadyInstalledNames.join(', ')}`);
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
        Helpers.run(`code --install-extension ${extname}`).sync();
        Helpers.taskDone(`Installed: ${extname}`);
      } catch (error) {
        Helpers.warn(`Not able to install ${extname}`);
        Helpers.pressKeyOrWait('Press any key to continue...');
      }
    }
    Helpers.info('Done installing');
    //#endregion
  }
  //#endregion

  //#region strip version
  /**
   * This pattern finds a dash followed by at least one digit.
   * It removes everything from that dash to the end of the string.
   * Examples:
   * "name-of-extension-1.2.3" -> "name-of-extension"
   * "extension-0.9.5-win32-x64" -> "extension"
   */
  protected stripVersion(folderName: string): string {
    return folderName.replace(/(-\d+.*)$/, '');
  }
  //#endregion

  //#region installed extensions
  get installedExtensions(): string[] {
    //#region @backendFunc
    /**
     * Removes trailing version/OS tags from folder names:
     *  e.g. "mariusalchimavicius.json-to-ts-1.8.0" -> "mariusalchimavicius.json-to-ts"
     *  e.g. "qwtel.sqlite-viewer-0.9.5-win32-x64" -> "qwtel.sqlite-viewer"
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
      .map(folder => this.stripVersion(folder.name));

    return Utils.uniqArray(extensions).map(c => (c as string).toLowerCase());
    //#endregion
  }
  //#endregion

  //#region apply proper global settings
  public static async applyProperGlobalSettings(): Promise<void> {
    //#region @backendFunc
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
      'github.copilot.search.enable': false,
      'github.copilot.chat.search.semanticTextResults': false,
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
        "dockerization",
        "matero",
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
    };
    //#endregion

    //#region global / settings paths
    const settingspathWindows = path.join(
      crossPlatformPath(os.userInfo().homedir),
      'AppData/Roaming/Code/User/settings.json',
    );
    const settingspathLinux = path.join(
      crossPlatformPath(os.userInfo().homedir),
      '.config/Code/User/settings.json',
    );
    let settingspath = path.join(
      crossPlatformPath(os.userInfo().homedir),
      'Library/Application Support/Code/User/settings.json',
    );

    if (process.platform === 'darwin') {
      settings = _.merge(settings, settingsMacOS);
    }
    if (process.platform === 'win32') {
      settingspath = settingspathWindows;
      settings = _.merge(settings, windowsSettings);
    }
    if (process.platform === 'linux') {
      settings = _.merge(settings, settingsLinux);
      settingspath = settingspathLinux;
    }
    //#endregion

    const dest = crossPlatformPath(settingspath);
    Helpers.writeFile(dest, settings);
    Helpers.info(`Vscode configured !`);
    //#endregion
  }
  //#endregion

  //#region get vscode bottom color
  /**
   * by default left menu color and bottom status bar are the same
   */
  getVscodeBottomColor(): string {
    return void 0;
  }
  //#endregion

  //#region refresh colors in settings
  refreshColorsInSettings(): void {
    const overideBottomColor = this.getVscodeBottomColor();
    UtilsVSCode.regenerateVsCodeSettingsColors(
      this.project.location,
      overideBottomColor,
    );
  }
  //#endregion

  //#region get basic settings
  async getBasicSettins(): Promise<object> {
    const settings = {
      '[markdown]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[typescriptreact]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[json]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[jsonc]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[json5]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[scss]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[html]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[javascript]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[typescript]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      '[dockercompose]': {
        'editor.defaultFormatter': 'esbenp.prettier-vscode',
        'editor.formatOnSave': false,
      },
      'editor.rulers': [80, 120],
      'eslint.migration.2_x': 'off',
      'eslint.enable': true,
      'prettier.enable': true,
      'editor.suggest.snippetsPreventQuickSuggestions': false,
      'editor.inlineSuggest.enabled': true,
      'prettier.prettierPath': './node_modules/prettier',
      'prettier.endOfLine': 'auto', // fix for jumpling to end of file when file > 100kb
      // 'tslint.autoFixOnSave': false,
      // 'tslint.enable': false,
      // 'tslint.alwaysShowRuleFailuresAsWarnings': false,
      // 'github.copilot.nextEditSuggestions.enabled': true,
      // 'github.copilot.chat.languageContext.inline.typescript.enabled': true,
      // 'github.copilot.chat.languageContext.typescript.enabled': true,
    };

    settings['search.useIgnoreFiles'] = false;
    settings['search.include'] = ['**/src/**'];
    settings['search.exclude'] = {
      bin: true,
      local_release: true,
      node_modules: true,
      '.build': true,
      '.vscode': true,
      browser: true,
      dist: true,
      ['dist-*']: true,
      'package-lock.json': true,
      'tmp-*': true,
      'src/lib/env/**/*.*': true,
      '*.rest': true,
    };

    Object.keys(settings['search.exclude']).forEach(k => {
      settings['search.exclude'][`**/${k}`] = true;
    });

    settings['search.exclude']['projects'] = true;

    return settings;
  }
  //#endregion

  //#region resolve params vscode
  protected async resolveParamsVscode(obj, prams: any[]): Promise<void> {
    //#region @backendFunc
    if (_.isObject(obj)) {
      const keys = Object.keys(obj);
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        if (_.isFunction(obj[key])) {
          obj[key] = await Helpers.runSyncOrAsync({
            functionFn: obj[key],
            arrayOfParams: prams,
          });
        } else if (_.isArray(obj[key])) {
          for (let index2 = 0; index2 < obj[key].length; index2++) {
            const o = obj[key][index2];
            await this.resolveParamsVscode(o, prams);
          }
        } else if (_.isObject(obj[key])) {
          await this.resolveParamsVscode(obj[key], prams);
        }
      }
    }
    //#endregion
  }
  //#endregion

  public toogleFilesVisibilityInVscode(options: {
    action: 'show-files' | 'hide-files';
    skipSaving?: boolean;
  }): void {
    options = options || ({} as any);
    const { action, skipSaving } = options;

    if (action === 'hide-files') {
      this.modifyVscode(settings => {
        settings['files.exclude'] =
          this.project.ignoreHide.getVscodeFilesFoldersAndPatternsToHide() ||
          {};
        return settings;
      });
      if (!skipSaving) {
        this.saveCurrentSettings();
      }
    } else if (action === 'show-files') {
      this.modifyVscode(settings => {
        settings['files.exclude'] = {};
        return settings;
      });
      if (!skipSaving) {
        this.saveCurrentSettings();
      }
    }
  }

  public changeColorThemeVscode(white = true): void {
    this.modifyVscode(settings => {
      settings['workbench.colorTheme'] = white
        ? 'Default Light+'
        : 'Kimbie Dark';
      return settings;
    });
    this.saveCurrentSettings();
  }
}
