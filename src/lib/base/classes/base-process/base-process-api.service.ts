//#region imports
import { Injectable } from '@angular/core'; // @browser
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Taon } from 'taon/src';

import type { BaseProcess } from './base-process';
import { BaseProcessController } from './base-process.controller';
//#endregion

//#region @browser
@Injectable()
//#endregion
export class BaseProcessApiService extends Taon.Base.AngularService {
  private baseProcessController = this.injectController(BaseProcessController) ;

  public get allMyEntities$(): Observable<BaseProcess[]> {
    return this.baseProcessController
      .getEntities()
      .request().observable.pipe(map(res => res.body.json));
  }
}