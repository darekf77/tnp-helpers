// //#region @browser

// import { NgModule } from '@angular/core';

// import { Component, OnInit } from '@angular/core';

// @Component({
//   selector: 'app-tnp-helpers',
//   template: `
//   hello world
//   `
// })

// export class TnpHelpersComponent implements OnInit {
//   constructor() { }

//   ngOnInit() { }
// }

// @NgModule({
//   imports: [],
//   exports: [TnpHelpersComponent],
//   declarations: [TnpHelpersComponent],
//   providers: [],
// })
// export class TnpHelpersModule { }

// //#endregion


// import { _, CoreModels } from 'tnp-core/src';

// //#region @backend
// import { Helpers } from './index';

// //#endregion
// import { CoreLibCategoryArr } from 'tnp-config';

// async function start() {

//   const data = _.times(25, (n) => {
//     return `file${n}`;
//   });

//   //#region @backend
//   await Helpers.workerCalculateArray(
//     data,
//     () => {
//       let { dataChunk, n, tnpModels } = global as {
//         dataChunk?: any[];
//         n?: number;
//         tnpModels?: typeof Models
//       };

//       // console.log(CoreLibCategoryArr.join(','));
//       // console.log(global['dataChunk'])
//       // console.log(global['n'])
//       // Helpers.writeFile('', dataChunk.join(''))
//       return new Promise(resolve => {
//         setTimeout(() => {
//           resolve();
//           console.log(CoreLibCategoryArr.join(','))
//           console.log(
//             `resolved worker ${n} `
//             + dataChunk.join(',')
//           )
//         }, 100);
//       })
//     }, {
//     globals: {
//       tnpModels: Models
//     }
//   });
//   //#endregion

// }


// export default start;

