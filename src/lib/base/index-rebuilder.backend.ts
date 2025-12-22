// import { _, path } from 'tnp-core/src';
// import { Helpers } from 'tnp-helpers/src';
// import { config } from 'tnp-core/src';
// import { crossPlatformPath } from 'tnp-core/src';
// import { IncCompiler } from 'incremental-compiler/src';
// import { BaseProject as Project } from './base-project';
// import { BaseDebounceCompilerForProject } from './base-debounce-compiler-for-project';

// const indexes = {};

// export class IndexRebuilder extends BaseDebounceCompilerForProject<Project> {
//   private base = this.project.pathFor(config.folder.libraries);

//   constructor(public project: Project) {
//     const libraries = project.pathFor(config.folder.libraries);
//     if (!Helpers.exists(libraries)) {
//       Helpers.mkdirp(libraries);
//     }
//     super(project, {
//       folderPath: [libraries],
//       taskName: 'IndexRebuilder',
//     });
//   }

//   private filesToRebuildIndex: { fileAbs: string; eventName: string }[] = [];
//   private rebuildIndex = _.debounce(() => {}, 1000);

//   private getLibName(fileAbs: string) {
//     const libName = _.first(fileAbs.replace(`${this.base}/`, '').split('/'));
//     return libName;
//   }

//   private getRelative(fileAbs: string) {
//     const libName = this.getLibName(fileAbs);
//     const relatvie = fileAbs.replace(`${this.base}/${libName}/`, '');
//     return relatvie;
//   }

//   private rewriteIndexForLibraries() {
//     const filePath = 'index.d.ts';
//     for (const libChild of this.project.libraryBuild.libraries) {
//       Helpers.writeFile(
//         libChild.pathFor(filePath),
//         `
// // THIS FILE IS GENERATED DO NOT MODIFY
// ${((indexes[libChild.basename] as string[]) || [])
//   .filter(exp => exp !== filePath)
//   .map(exp => {
//     return `export * from "./${exp.replace(/\.ts$/, '')}";`;
//   })
//   .join('\n')}
// // THIS FILE IS GENERATED DO NOT MODIFY
//       `,
//       );
//     }
//   }

//   private files: string[] = [];

//   //#region methods / action
//   action({
//     changeOfFiles,
//     asyncEvent,
//   }: {
//     changeOfFiles: IncCompiler.Change[];
//     asyncEvent: boolean;
//   }) {
//     //#region @backendFunc
//     const files = this.filesToRebuildIndex.filter(f =>
//       f.fileAbs.endsWith('.ts'),
//     );
//     this.filesToRebuildIndex = [];
//     let rewrite = false;
//     for (const file of files) {
//       const { fileAbs, eventName } = file;
//       const libName = this.getLibName(fileAbs);
//       const relatvie = this.getRelative(fileAbs);
//       if (eventName === 'unlink') {
//         // console.log(`unlink: ${relatvie}`)
//         if (indexes[libName].includes(relatvie)) {
//           indexes[libName] = indexes[libName].filter(f => f !== relatvie);
//           rewrite = true;
//         }
//       } else {
//         // console.log(`link: ${relatvie}`)
//         if (!indexes[libName].includes(relatvie)) {
//           indexes[libName].push(relatvie);
//           rewrite = true;
//         }
//       }
//     }
//     if (rewrite) {
//       this.rewriteIndexForLibraries();
//     }
//     //#endregion
//   }
//   //#endregion

//   async syncAction(files: string[]) {
//     files = files.filter(f => f.endsWith('.ts'));
//     this.files = files;

//     for (const fileAbs of files) {
//       const base = this.project.pathFor(config.folder.libraries);

//       const libName = _.first(fileAbs.replace(`${base}/`, '').split('/'));
//       if (_.isUndefined(indexes[libName])) {
//         indexes[libName] = [];
//       }
//       indexes[libName].push(this.getRelative(fileAbs));
//     }
//     this.rewriteIndexForLibraries();
//   }

//   async asyncAction(event: IncCompiler.Change) {
//     // console.log({ event })
//     // console.log(`ASYNC ${event.eventName}: ${event.fileAbsolutePath}`);

//     if (event.eventName === 'unlink') {
//       this.files = this.files.filter(f => f === event.fileAbsolutePath);
//     }
//     if (event.eventName === 'add') {
//       this.files.push(event.fileAbsolutePath);
//     }

//     if (event.eventName === 'unlinkDir') {
//       for (const fileAbs of this.files.filter(f =>
//         f.startsWith(event.fileAbsolutePath),
//       )) {
//         this.filesToRebuildIndex.push({
//           eventName: 'unlink',
//           fileAbs,
//         });
//       }
//     } else {
//       this.filesToRebuildIndex.push({
//         eventName: event.eventName,
//         fileAbs: event.fileAbsolutePath,
//       });
//     }
//     this.rebuildIndex();
//   }
// }