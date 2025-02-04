//#region @backend
import {
  crossPlatformPath,
  fse,
  os,
  path,
  Utils,
  UtilsTerminal,
} from 'tnp-core/src';
//#endregion
import { Helpers } from '../../index';
import type { BaseProject } from './base-project';
import { BaseFeatureForProject } from './base-feature-for-project';
import { _ } from 'tnp-core/src';

export class BaseVscodeHelpers<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  /**
   * settings.json relative path
   */
  public readonly settingsJson = '.vscode/settings.json';
  public readonly extensionsJson = '.vscode/extensions.json';

  //#region extensions
  private get extensions(): string[] {
    return Helpers.uniqArray([
      //#region @backend
      // 'Angular.ng-template', // high cpu usage
      'EditorConfig.EditorConfig',
      'GitHub.copilot',
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
      'eamodio.gitlens',
      'eg2.tslint',
      'esbenp.prettier-vscode',
      'henry-li.vscode-import-formatter',
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
      'oven.bun-vscode',
      'qwtel.sqlite-viewer',
      'redhat.vscode-xml',
      'ritwickdey.create-file-folder',
      'rogalmic.bash-debug',
      'rssowl.copy-relative-path-posix',
      'ryanlaws.toggle-case',
      'saber2pr.file-git-history',
      'shakram02.bash-beautify',
      'stepanog.angular1-inline',
      'taddison.gitlazy',
      'unifiedjs.vscode-mdx',
      'tommasov.hosts',
      // 'vespa-dev-works.jestrunit',
      'firsttris.vscode-jest-runner', // better for jest
      'waderyan.gitblame',

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
      'pranaygp.vscode-css-peek',
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
      ...(process.platform === 'win32'
        ? [
            // wsl
            'ms-vscode-remote.remote-wsl',
            'kgrzywocz.wsl-path',
            // ---
            // 'skacekachna.win-opacity',
            // 'electrotype.windows-explorer-context-menu',
            // escape win path on paset TODO CHECK THIS
            // 'coalaura.win-path',
          ]
        : []),

      // nice extension but not use for now in taon
      // csv thing
      // 'mechatroner.rainbow-csv',

      //#endregion
    ]).map(c => (c as string).toLowerCase());
  }
  //#endregion

  //#region recreate extensions
  recreateExtensions(): void {
    //#region @backendFunc
    this.project.writeFile(
      this.extensionsJson,
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

  //#region recraete window title
  recreateWindowTitle(): void {
    //#region @backendFunc
    this.project.setValueToJSONC(
      this.settingsJson,
      '["window.title"]',
      this.project.titleBarName,
    );
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

  //#region  installed extensions
  get installedExtensions(): string[] {
    //#region @backendFunc
    /**
     * Removes trailing version/OS tags from folder names:
     *  e.g. "mariusalchimavicius.json-to-ts-1.8.0" -> "mariusalchimavicius.json-to-ts"
     *  e.g. "qwtel.sqlite-viewer-0.9.5-win32-x64" -> "qwtel.sqlite-viewer"
     */

    // Adjust the folder path as needed (Insiders, etc.)
    const extensionsPath = path.join(os.homedir(), '.vscode', 'extensions');

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

  //#region  apply proper global settings
  async applyProperGlobalSettings(): Promise<void> {
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

    //#region global / setting for all

    let settings = {
      // 'scm.showIncomingChanges': false,
      // 'scm.showOutgoingChanges': false,
      'workbench.layoutControl.enabled': false,
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
        'mkdocs',
      ],
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
      settingspath = settingspathLinux;
    }
    //#endregion

    const dest = crossPlatformPath(settingspath);
    Helpers.writeFile(dest, settings);
    Helpers.info(`Vscode configured !`);
    //#endregion
  }
  //#endregion
}
