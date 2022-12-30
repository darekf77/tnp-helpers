import { path } from 'tnp-core';
import { FiredevModels } from './firedev-models';
import { Helpers, Project } from './index';
import * as JSON5 from 'json5';

export class HelpersVscode {


  getSettingsFrom(project: Project) {
    let settings: FiredevModels.VSCodeSettings;
    const pathSettingsVScode = path.join(project.location, '.vscode', 'settings.json')
    if (Helpers.exists(pathSettingsVScode)) {
      settings = JSON5.parse(Helpers.readFile(pathSettingsVScode))
    }
    return settings;
  }

}
