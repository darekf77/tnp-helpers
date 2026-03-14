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
import { Helpers, _ } from 'tnp-core/src';

import { HelpersTaon, UtilsVSCode } from '../../index';

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

  //#region recreate extensions
  recreateExtensions(): void {
    //#region @backendFunc
    this.project.writeFile(
      this.relativePathExtensionJsonVScode,
      JSON.stringify(
        {
          recommendations: UtilsVSCode.getExtensions(),
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
      'typescript.suggest.autoImports': false,
      'javascript.suggest.autoImports': false,
    };

    settings['files.associations'] = {
      'tsconfig.json': 'json',
    };

    settings['search.followSymlinks'] = false;
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
