// //#region @browser
// import { Subscription } from 'rxjs';
// import { OnDestroy, OnInit, Component, Input } from '@angular/core';
// import { NavigationEnd, Router } from '@angular/router';


// @Component({
//   selector: 'app-base-component-meta',
//   template: '<div></div>'
// })
// export abstract class BaseComponent implements OnDestroy {

//   // @ts-ignore
//   @Input() model: any = {};

//   handlers: Subscription[] = [];

//   ngOnDestroy(): void {
//     this.handlers.forEach(h => h.unsubscribe());
//     this.handlers.length = 0;
//   }


// }

// const isCalledNgInitAfterInternalRefresh = Symbol()

// export abstract class BaseComponentForRouter extends BaseComponent {

//   constructor(
//     private __router: Router
//   ) {
//     super();
//     this[isCalledNgInitAfterInternalRefresh] = false;
//   }


//   protected isCalledNgInitAfterInternalRefresh() {
//     return !!this[isCalledNgInitAfterInternalRefresh];
//   }
//   protected reloadNgOninitOnUrlChange() {
//     this.handlers.push(this.__router.events.subscribe(event => {
//       if (event instanceof NavigationEnd && this['ngOnInit']) {
//         this[isCalledNgInitAfterInternalRefresh] = true;
//         this['ngOnInit']();
//         if (this[isCalledNgInitAfterInternalRefresh]) {
//           this[isCalledNgInitAfterInternalRefresh] = false;
//         }
//       }
//     }) as any);
//   }

// }
// //#endregion
