//#region imports
import { CommonModule } from '@angular/common'; // @browser
import { NgModule, inject, Injectable } from '@angular/core'; // @browser
import { Component, OnInit } from '@angular/core'; // @browser
import { VERSION } from '@angular/core'; // @browser
import Aura from '@primeng/themes/aura'; // @browser
import { MaterialCssVarsModule } from 'angular-material-css-vars'; // @browser
import { providePrimeNG } from 'primeng/config'; // @browser
import { Observable, map } from 'rxjs';
import { Taon, BaseContext, TAON_CONTEXT } from 'taon/src';
import { UtilsOs } from 'tnp-core/src';

import { HOST_URL, FRONTEND_HOST_URL } from './app.hosts';
//#endregion

console.log('hello world');
console.log('Your server will start on port ' + HOST_URL.split(':')[2]);

//#region tnp-helpers component
//#region @browser
@Component({
  selector: 'app-tnp-helpers',
  standalone: false,
  template: `hello from tnp-helpers<br />
    Angular version: {{ angularVersion }}<br />
    <br />
    users from backend
    <ul>
      <li *ngFor="let user of users$ | async">{{ user | json }}</li>
    </ul>
    hello world from backend: <strong>{{ hello$ | async }}</strong> `,
  styles: [
    `
      body {
        margin: 0px !important;
      }
    `,
  ],
})
export class TnpHelpersComponent {
  angularVersion =
    VERSION.full +
    ` mode: ${UtilsOs.isRunningInWebSQL() ? ' (websql)' : '(normal)'}`;
  userApiService = inject(UserApiService);
  readonly users$: Observable<User[]> = this.userApiService.getAll();
  readonly hello$ = this.userApiService.userController
    .helloWorld()
    .request()
    .observable.pipe(map(r => r.body.text));
}
//#endregion
//#endregion

//#region  tnp-helpers api service
//#region @browser
@Injectable({
  providedIn: 'root',
})
export class UserApiService extends Taon.Base.AngularService {
  userController = this.injectController(UserController);
  getAll(): Observable<User[]> {
    return this.userController
      .getAll()
      .request()
      .observable.pipe(map(r => r.body.json));
  }
}
//#endregion
//#endregion

//#region  tnp-helpers module
//#region @browser
@NgModule({
  providers: [
    {
      provide: TAON_CONTEXT,
      useFactory: () => MainContext,
    },
    providePrimeNG({
      // inited ng prime - remove if not needed
      theme: {
        preset: Aura,
      },
    }),
  ],
  exports: [TnpHelpersComponent],
  imports: [
    CommonModule,
    MaterialCssVarsModule.forRoot({
      // inited angular material - remove if not needed
      primary: '#4758b8',
      accent: '#fedfdd',
    }),
  ],
  declarations: [TnpHelpersComponent],
})
export class TnpHelpersModule {}
//#endregion
//#endregion

//#region  tnp-helpers entity
@Taon.Entity({ className: 'User' })
class User extends Taon.Base.AbstractEntity {
  //#region @websql
  @Taon.Orm.Column.String()
  //#endregion
  name?: string;
}
//#endregion

//#region  tnp-helpers controller
@Taon.Controller({ className: 'UserController' })
class UserController extends Taon.Base.CrudController<User> {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  entityClassResolveFn = () => User;

  @Taon.Http.GET()
  helloWorld(): Taon.Response<string> {
    return async (req, res) => 'hello world';
  }
}
//#endregion

//#region  tnp-helpers migration
//#region @websql
@Taon.Migration({
  className: 'UserMigration',
})
class UserMigration extends Taon.Base.Migration {
  userController = this.injectRepo(User);
  async up(): Promise<any> {
    const superAdmin = new User();
    superAdmin.name = 'super-admin';
    await this.userController.save(superAdmin);
  }
}
//#endregion
//#endregion

//#region  tnp-helpers context
var MainContext = Taon.createContext(() => ({
  host: HOST_URL,
  appId: 'dev.taon.tnp-helpers.app',
  frontendHost: FRONTEND_HOST_URL,
  contextName: 'MainContext',
  contexts: { BaseContext },
  migrations: {
    //#region @websql
    UserMigration,
    //#endregion
  },
  controllers: {
    UserController,
  },
  entities: {
    User,
  },
  database: true,
  // disabledRealtime: true,
}));
//#endregion

async function start(): Promise<void> {
  await MainContext.initialize();

  if (Taon.isBrowser) {
    const users = (
      await MainContext.getClassInstance(UserController).getAll().request()
    ).body?.json;
    console.log({
      'users from backend': users,
    });
  }
}

export default start;
