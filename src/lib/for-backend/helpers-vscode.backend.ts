import { path } from 'tnp-core';

import { Helpers } from '../index';
import * as JSON5 from 'json5';
import { ConfigModels } from 'tnp-config';
import type { BaseProject } from '../index';
export class HelpersVscode {


  getSettingsFrom(project: BaseProject) {
    let settings: ConfigModels.VSCodeSettings;
    const pathSettingsVScode = path.join(project.location, '.vscode', 'settings.json')
    if (Helpers.exists(pathSettingsVScode)) {
      settings = JSON5.parse(Helpers.readFile(pathSettingsVScode))
    }
    return settings;
  }

}
