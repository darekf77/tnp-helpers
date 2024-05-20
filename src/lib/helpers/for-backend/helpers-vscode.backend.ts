import { path } from 'tnp-core';

import { Helpers } from '../../index';
import * as JSON5 from 'json5';
import { CoreModels } from 'tnp-core/src';
import type { BaseProject } from '../../index';
export class HelpersVscode {


  getSettingsFrom(project: BaseProject) {
    let settings: CoreModels.VSCodeSettings;
    const pathSettingsVScode = path.join(project.location, '.vscode', 'settings.json')
    if (Helpers.exists(pathSettingsVScode)) {
      settings = JSON5.parse(Helpers.readFile(pathSettingsVScode))
    }
    return settings;
  }

}
