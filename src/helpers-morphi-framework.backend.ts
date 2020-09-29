import * as glob from 'glob';
import * as path from 'path';
import { config } from 'tnp-config';
import { HelpersMerge } from './merge-helpers.backend';

export class HelpersMorphiFramework {

  getEntites(cwd: string): string[] {
    const entityRegEx = /^([A-Z]|\_|[0-9])+\.ts$/;
    return glob
      .sync(`${config.folder.apps}/**/*.ts`, {
        cwd: cwd
      }).filter(p => {

        const isMatchRegex = entityRegEx.test(path.basename(p));
        // if (!isMatchRegex) {
        //   log(`Not match entity patern: ${p + path.basename(p)}`)
        // }
        return isMatchRegex &&
          !path.basename(p).startsWith(HelpersMerge.BaselineSiteJoinprefix) &&
          !p.endsWith('Controller.ts') &&
          !p.endsWith('_REPOSITORY.ts') &&
          !p.endsWith('.REPOSITORY.ts') &&
          !p.endsWith('Repository.ts') &&
          !p.endsWith('Service.ts') &&
          !p.endsWith('.d.ts') &&
          !p.endsWith('.spec.ts') &&
          !p.endsWith('.component.ts') &&
          !p.endsWith('.module.ts') &&
          !p.endsWith('.service.ts') &&
          !p.endsWith('.model.ts') &&
          !(['index.ts', 'app.ts', 'controllers.ts', 'entities.ts'].includes(path.basename(p)));
      })
  }


  getControllers(cwd: string): string[] {
    return glob
      .sync(`${config.folder.apps}/**/*Controller.ts`, {
        cwd: cwd
      })
      .filter(p => {
        return !path.basename(p).startsWith(HelpersMerge.BaselineSiteJoinprefix);
      });
  }


}
