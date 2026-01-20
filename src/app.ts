// //#region imports
// import * as os from 'os'; // @backend

// import { AsyncPipe, JsonPipe, NgFor } from '@angular/common'; // @browser
// import {
//   inject,
//   Injectable,
//   APP_INITIALIZER,
//   ApplicationConfig,
//   provideBrowserGlobalErrorListeners,
//   isDevMode,
//   mergeApplicationConfig,
//   provideZonelessChangeDetection,
//   signal,
// } from '@angular/core'; // @browser
// import { Component } from '@angular/core'; // @browser
// import { VERSION } from '@angular/core'; // @browser
// import {
//   provideClientHydration,
//   withEventReplay,
// } from '@angular/platform-browser';
// import {
//   provideRouter,
//   Router,
//   RouterLinkActive,
//   RouterModule,
//   RouterOutlet,
//   ActivatedRoute,
//   Routes,
//   Route,
// } from '@angular/router';
// import { provideServiceWorker } from '@angular/service-worker';
// import { provideServerRendering, withRoutes } from '@angular/ssr';
// import { RenderMode, ServerRoute } from '@angular/ssr';
// import Aura from '@primeng/themes/aura'; // @browser
// import { providePrimeNG } from 'primeng/config'; // @browser
// import { toSignal } from '@angular/core/rxjs-interop'; // @browser
// import { BehaviorSubject, Observable, map, switchMap } from 'rxjs';
// import { MatCardModule } from '@angular/material/card'; // @browser
// import { MatIconModule } from '@angular/material/icon'; // @browser
// import { MatDividerModule } from '@angular/material/divider'; // @browser
// import { MatButtonModule } from '@angular/material/button'; // @browser
// import { MatListModule } from '@angular/material/list'; // @browser
// import { MatTabsModule } from '@angular/material/tabs'; // @browser
// import {
//   Taon,
//   TaonBaseContext,
//   TAON_CONTEXT,
//   EndpointContext,
//   TaonBaseAngularService,
//   TaonEntity,
//   StringColumn,
//   TaonBaseAbstractEntity,
//   TaonBaseCrudController,
//   TaonController,
//   GET,
//   TaonMigration,
//   TaonBaseMigration,
// } from 'taon/src';
// import { Utils, UtilsOs } from 'tnp-core/src';

// import { HOST_CONFIG } from './app.hosts';
// // @placeholder-for-imports
// import { HelpersCheckActiveContext } from './app/helpers-check/helpers-check.active.context'; // @app-ts-generated
// //#endregion

// const firstHostConfig = (Object.values(HOST_CONFIG) || [])[0];
// console.log('Your backend host ' + firstHostConfig?.host);
// console.log('Your frontend host ' + firstHostConfig?.frontendHost);

// //#region tnp-helpers component

// //#region @browser
// @Component({
//   selector: 'app-root',

//   imports: [
//     // RouterOutlet,
//     AsyncPipe,
//     MatCardModule,
//     MatIconModule,
//     MatDividerModule,
//     MatButtonModule,
//     MatListModule,
//     MatTabsModule,
//     RouterModule,
//     JsonPipe,
//   ],
//   template: `
//     @if (itemsLoaded()) {
//       @if (navItems.length > 0) {
//         <nav
//           mat-tab-nav-bar
//           class="shadow-1"
//           [tabPanel]="tabPanel">
//           @for (item of navItems; track item.path) {
//             <a
//               mat-tab-link
//               href="javascript:void(0)"
//               [style.text-decoration]="
//                 (activePath === item.path && !forceShowBaseRootApp) ||
//                 ('/' === item.path && forceShowBaseRootApp)
//                   ? 'underline'
//                   : 'none'
//               "
//               (click)="navigateTo(item)">
//               @if (item.path === '/') {
//                 <mat-icon
//                   aria-hidden="false"
//                   aria-label="Example home icon"
//                   fontIcon="home"></mat-icon>
//               } @else {
//                 {{ item.label }}
//               }
//             </a>
//           }
//         </nav>

//         <mat-tab-nav-panel #tabPanel>
//           @if (!forceShowBaseRootApp) {
//             <router-outlet />
//           }
//         </mat-tab-nav-panel>
//       }
//       @if (navItems.length === 0 || forceShowBaseRootApp) {
//         <mat-card class="m-2">
//           <mat-card-content>
//             <h3>Basic app info</h3>
//             Name: tnp-helpers<br />
//             Angular version: {{ angularVersion }}<br />
//             Taon backend: {{ taonMode }}<br />
//           </mat-card-content>
//         </mat-card>

//         <mat-card class="m-2">
//           <mat-card-content>
//             <h3>Example users from backend API:</h3>
//             <ul>
//               @for (user of users(); track user.id) {
//                 <li>
//                   {{ user | json }}
//                   <button
//                     mat-flat-button
//                     (click)="deleteUser(user)">
//                     <mat-icon>delete user</mat-icon>
//                   </button>
//                 </li>
//               }
//             </ul>
//             <br />
//             <button
//               class="ml-1"
//               matButton="outlined"
//               (click)="addUser()">
//               Add new example user with random name
//             </button>
//           </mat-card-content>
//         </mat-card>

//         <mat-card class="m-2">
//           <mat-card-content>
//             <h3>Example hello world from backend API:</h3>
//             hello world from backend: <strong>{{ hello$ | async }}</strong>
//           </mat-card-content>
//         </mat-card>
//       }
//     }
//   `,
// })
// export class TnpHelpersApp {
//   itemsLoaded = signal(false);
//   navItems =
//     TnpHelpersClientRoutes.length <= 1
//       ? []
//       : TnpHelpersClientRoutes.filter(r => r.path !== undefined).map(r => ({
//           path: r.path === '' ? '/' : `/${r.path}`,
//           label: r.path === '' ? 'Home' : `${r.path}`,
//         }));

//   activatedRoute = inject(ActivatedRoute);

//   get activePath(): string {
//     return globalThis?.location.pathname?.split('?')[0];
//   }

//   ngOnInit(): void {
//     //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
//     //Add 'implements OnInit' to the class.
//     console.log(globalThis?.location.pathname);
//     // TODO set below from 1000 to zero in production
//     Taon.removeLoader(1000).then(() => {
//       this.itemsLoaded.set(true);
//     });
//   }

//   taonMode = UtilsOs.isRunningInWebSQL() ? 'websql' : 'normal nodejs';
//   angularVersion = VERSION.full;
//   userApiService = inject(UserApiService);
//   router = inject(Router);
//   private refresh = new BehaviorSubject<void>(undefined);

//   readonly users = toSignal(
//     this.refresh.pipe(
//       switchMap(() =>
//         this.userApiService.userController
//           .getAll()
//           .request()
//           .observable.pipe(map(r => r.body.json)),
//       ),
//     ),
//     { initialValue: [] },
//   );

//   readonly hello$ = this.userApiService.userController
//     .helloWorld()
//     .request()
//     .observable.pipe(map(r => r.body.text));

//   async deleteUser(userToDelete: User): Promise<void> {
//     await this.userApiService.userController
//       .deleteById(userToDelete.id)
//       .request();
//     this.refresh.next();
//   }

//   async addUser(): Promise<void> {
//     const newUser = new User();
//     newUser.name = `user-${Math.floor(Math.random() * 1000)}`;
//     await this.userApiService.userController.save(newUser).request();
//     this.refresh.next();
//   }

//   forceShowBaseRootApp = false;
//   navigateTo(item: { path: string; label: string }): void {
//     if (item.path === '/') {
//       if (this.forceShowBaseRootApp) {
//         return;
//       }
//       this.forceShowBaseRootApp = true;
//       return;
//     }
//     this.forceShowBaseRootApp = false;
//     this.router.navigateByUrl(item.path);
//   }
// }
// //#endregion

// //#endregion

// //#region  tnp-helpers api service

// //#region @browser
// @Injectable({
//   providedIn: 'root',
// })
// export class UserApiService extends TaonBaseAngularService {
//   userController = this.injectController(UserController);

//   getAll(): Observable<User[]> {
//     return this.userController
//       .getAll()
//       .request()
//       .observable.pipe(map(r => r.body.json));
//   }
// }
// //#endregion

// //#endregion

// //#region  tnp-helpers routes
// //#region @browser
// export const TnpHelpersServerRoutes: ServerRoute[] = [
//   {
//     path: '**',
//     renderMode: RenderMode.Prerender,
//   },
// ];
// export const TnpHelpersClientRoutes: Routes = [
//   {
//     path: '',
//     pathMatch: 'full',
//     redirectTo: () => {
//       if (TnpHelpersClientRoutes.length === 1) {
//         return '';
//       }
//       return TnpHelpersClientRoutes.find(r => r.path !== '')!.path!;
//     },
//   },
//   // PUT ALL ROUTES HERE
//   // @placeholder-for-routes
//   // @app-ts-generated
//   {
//     path: 'helpers-check',
//     providers: [
//       {
//         provide: TAON_CONTEXT,
//         useFactory: () => HelpersCheckActiveContext,
//       },
//     ],
//     loadChildren: () =>
//       import('./app/helpers-check/helpers-check.routes').then(
//         m => m.HelpersCheckRoutes,
//       ),
//   },
// ];
// //#endregion
// //#endregion

// //#region  tnp-helpers app configs
// //#region @browser
// export const TnpHelpersAppConfig: ApplicationConfig = {
//   providers: [
//     provideZonelessChangeDetection(),
//     {
//       provide: TAON_CONTEXT,
//       useFactory: () => TnpHelpersContext,
//     },
//     providePrimeNG({
//       theme: {
//         preset: Aura,
//       },
//     }),
//     {
//       provide: APP_INITIALIZER,
//       multi: true,
//       useFactory: () => TnpHelpersStartFunction,
//     },
//     provideBrowserGlobalErrorListeners(),
//     provideRouter(TnpHelpersClientRoutes),
//     provideClientHydration(withEventReplay()),
//     provideServiceWorker('ngsw-worker.js', {
//       enabled: !isDevMode(),
//       registrationStrategy: 'registerWhenStable:30000',
//     }),
//   ],
// };

// export const TnpHelpersServerConfig: ApplicationConfig = {
//   providers: [provideServerRendering(withRoutes(TnpHelpersServerRoutes))],
// };

// export const TnpHelpersConfig = mergeApplicationConfig(
//   TnpHelpersAppConfig,
//   TnpHelpersServerConfig,
// );
// //#endregion
// //#endregion

// //#region  tnp-helpers entity
// @TaonEntity({ className: 'User' })
// class User extends TaonBaseAbstractEntity {
//   //#region @websql
//   @StringColumn()
//   //#endregion
//   name?: string;

//   getHello(): string {
//     return `hello ${this.name}`;
//   }
// }
// //#endregion

// //#region  tnp-helpers controller
// @TaonController({ className: 'UserController' })
// class UserController extends TaonBaseCrudController<User> {
//   // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
//   entityClassResolveFn = () => User;

//   @GET()
//   helloWorld(): Taon.Response<string> {
//     //#region @websqlFunc
//     return async (req, res) => 'hello world';
//     //#endregion
//   }

//   @GET()
//   getOsPlatform(): Taon.Response<string> {
//     //#region @websqlFunc
//     return async (req, res) => {
//       //#region @backend
//       return os.platform(); // for normal nodejs backend return real value
//       //#endregion

//       return 'no-platform-inside-browser-and-websql-mode';
//     };
//     //#endregion
//   }
// }
// //#endregion

// //#region  tnp-helpers migration

// //#region @websql
// @TaonMigration({
//   className: 'UserMigration',
// })
// class UserMigration extends TaonBaseMigration {
//   userController = this.injectRepo(User);

//   async up(): Promise<any> {
//     const superAdmin = new User();
//     superAdmin.name = 'super-admin';
//     await this.userController.save(superAdmin);
//   }
// }
// //#endregion

// //#endregion

// //#region  tnp-helpers context
// var TnpHelpersContext = Taon.createContext(() => ({
//   ...HOST_CONFIG['TnpHelpersContext'],
//   contexts: { TaonBaseContext },

//   //#region @websql
//   /**
//    * In production use specyfic for this context name
//    * generated migration object from  ./migrations/index.ts.
//    */
//   migrations: {
//     UserMigration,
//   },
//   //#endregion

//   controllers: {
//     UserController,
//   },
//   entities: {
//     User,
//   },
//   database: true,
//   // disabledRealtime: true,
// }));
// //#endregion

// //#region  tnp-helpers start function
// const TnpHelpersStartFunction = async (
//   startParams?: Taon.StartParams,
// ): Promise<void> => {
//   await TnpHelpersContext.initialize();
//   // @placeholder-for-contexts-init
//   await HelpersCheckActiveContext.initialize(); // @app-ts-generated
//   // INIT ALL ACTIVE CONTEXTS HERE

//   //#region @backend
//   if (
//     startParams?.onlyMigrationRun ||
//     startParams?.onlyMigrationRevertToTimestamp
//   ) {
//     process.exit(0);
//   }
//   //#endregion

//   //#region @backend
//   console.log(`Hello in NodeJs backend! os=${os.platform()}`);
//   //#endregion
// };
// //#endregion

// export default TnpHelpersStartFunction;
