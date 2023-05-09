import { path } from 'tnp-core';
import * as glob from 'glob';
import { config } from 'tnp-config';
import { BaselineSiteJoinprefix } from './constants';

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
          !path.basename(p).startsWith(BaselineSiteJoinprefix) &&
          !p.endsWith('Controller.ts') &&
          !p.endsWith('_REPOSITORY.ts') &&
          !p.endsWith('.REPOSITORY.ts') &&
          !p.endsWith('Repository.ts') &&
          !p.endsWith('Service.ts') &&
          !p.endsWith('.d.ts') &&
          !p.endsWith('.spec.ts') &&
          !p.endsWith('.e2e-spec.ts') &&
          !p.endsWith('.component.ts') &&
          !p.endsWith('.container.ts') &&
          !p.endsWith('.module.ts') &&
          !p.endsWith('.models.ts') &&
          !p.endsWith('.service.ts') &&
          !p.endsWith('.guard.ts') &&
          !p.endsWith('.test.ts') &&
          !p.endsWith('.model.ts') &&
          !p.endsWith('.pipe.ts') &&
          !p.endsWith('.class.ts') &&
          !p.endsWith('.directive.ts') &&
          !p.endsWith('.interface.ts') &&
          !(['index.ts', 'app.ts', 'controllers.ts', 'entities.ts'].includes(path.basename(p)));
      })
  }


  getControllers(cwd: string): string[] {
    return glob
      .sync(`${config.folder.apps}/**/*Controller.ts`, {
        cwd: cwd
      })
      .filter(p => {
        return !path.basename(p).startsWith(BaselineSiteJoinprefix);
      });
  }


}
