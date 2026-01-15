//#region imports
import { Routes } from '@angular/router';

import { HelpersCheckContainer } from './helpers-check.container';
//#endregion

export const HelpersCheckRoutes: Routes = [
  {
    path: '',
    component: HelpersCheckContainer,
  },
  // {
  //   path: 'anothermodulepath',
  //   loadChildren: () => import('anothermodule')
  //     .then(m => m.AnotherLazyModule),
  // },
];