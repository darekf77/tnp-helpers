//#region imports
import { Taon, BaseContext } from 'taon/src';
import { Observable, map } from 'rxjs';
import {
  CLIENT_DEV_NORMAL_APP_PORT,
  CLIENT_DEV_WEBSQL_APP_PORT,
  HOST_BACKEND_PORT,
} from './app.hosts';
import { Helpers } from 'tnp-helpers/src';
//#region @browser
import { NgModule, inject, Injectable } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

//#endregion
const frontendHost =
  'http://localhost:' +
  (Helpers.isWebSQL ? CLIENT_DEV_WEBSQL_APP_PORT : CLIENT_DEV_NORMAL_APP_PORT);

//#endregion

console.log('hello world');
console.log('Your server will start on port ' + HOST_BACKEND_PORT);
const host = 'http://localhost:' + HOST_BACKEND_PORT;

//#region tnp-helpers component
//#region @browser
@Component({
  selector: 'app-tnp-helpers',
  template: `hello from tnp-helpers<br />
    <br />
    users from backend
    <ul>
      <li *ngFor="let user of users$ | async">{{ user | json }}</li>
    </ul> `,
  styles: [
    `
      body {
        margin: 0px !important;
      }
    `,
  ],
})
export class TnpHelpersComponent {
  userApiService = inject(UserApiService);
  readonly users$: Observable<User[]> = this.userApiService.getAll();
}
//#endregion
//#endregion

//#region  tnp-helpers api service
//#region @browser
@Injectable({
  providedIn: 'root',
})
export class UserApiService {
  userControlller = Taon.inject(() => MainContext.getClass(UserController));
  getAll() {
    return this.userControlller
      .getAll()
      .received.observable.pipe(map(r => r.body.json));
  }
}
//#endregion
//#endregion

//#region  tnp-helpers module
//#region @browser
@NgModule({
  exports: [TnpHelpersComponent],
  imports: [CommonModule],
  declarations: [TnpHelpersComponent],
})
export class TnpHelpersModule {}
//#endregion
//#endregion

//#region  tnp-helpers entity
@Taon.Entity({ className: 'User' })
class User extends Taon.Base.AbstractEntity {
  public static ctrl?: UserController;
  //#region @websql
  @Taon.Orm.Column.String()
  //#endregion
  name?: string;
}
//#endregion

//#region  tnp-helpers controller
@Taon.Controller({ className: 'UserController' })
class UserController extends Taon.Base.CrudController<User> {
  entityClassResolveFn = () => User;
  //#region @websql
  async initExampleDbData(): Promise<void> {
    const superAdmin = new User();
    superAdmin.name = 'super-admin';
    await this.db.save(superAdmin);
  }
  //#endregion

  @Taon.Http.GET({
    path: '/',
    pathIsGlobal: true,
  })
  hello(): Taon.Response<string> {
    return async (req, res) => 'hello world';
  }
}
//#endregion

//#region  tnp-helpers context
const MainContext = Taon.createContext(() => ({
  host,
  frontendHost,
  contextName: 'MainContext',
  contexts: { BaseContext },
  controllers: {
    UserController,
    // PUT FIREDEV CONTORLLERS HERE
  },
  entities: {
    User,
    // PUT FIREDEV ENTITIES HERE
  },
  database: true,
  // disabledRealtime: true,
}));
//#endregion

async function start() {
  await MainContext.initialize();

  if (Taon.isBrowser) {
    const users = (
      await MainContext.getClassInstance(UserController).getAll().received
    ).body?.json;
    console.log({
      'users from backend': users,
    });
  }
}

export default start;
