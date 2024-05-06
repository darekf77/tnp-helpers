// import { _, path } from 'tnp-core';
// import { BaseProject as Project } from './base-project';
// import { Helpers } from 'tnp-helpers/src';
// import { config } from 'tnp-config/src';
// import { IncCompiler } from 'incremental-compiler/src';


// const indexes = {};

// export interface IncrementaBuildOptions {
//   watchBuildProjects?: string[];
//   rebuildAll?: boolean;
// }

// @IncCompiler.Class({ className: 'IndexRebuilder' })
// export class IndexRebuilder extends IncCompiler.Base<IncrementaBuildOptions> {

//   readonly base: string;

//   constructor(
//     public project: Project
//   ) {
//     super();
//     this.base = project.pathFor('projects') || project.pathFor(config.folder.libraries);

//     console.log(`Base for index rebuilder: ${this.base}`)

//     if (!Helpers.exists(this.base)) {
//       Helpers.mkdirp(this.base);
//     }

//     super({
//       folderPath: [this.base],
//     });
//   }

//   private filesToRebuildIndex: { fileAbs: string; eventName: string; }[] = [];
//   private rebuildIndex = _.debounce(() => {
//     const files = this.filesToRebuildIndex;
//     // console.log(`files to rebuild index: ${files.map(f => f.fileAbs).join(', ')}`)
//     this.filesToRebuildIndex = [];
//     // let rewrite = false;
//     for (const file of files) {
//       const { fileAbs, eventName } = file;
//       const libName = this.getLibBasenameFromPath(fileAbs);

//       const lib = this.project.libraries.find(f => f.basename === libName);
//       // const sourceDist = this.project.pathFor([config.folder.dist, lib.basename]);
//       // const dest = this.project.pathFor([config.folder.node_modules, lib.name]);
//       // Helpers.copy(sourceDist, dest);
//       // console.log(`Sync done for ${lib.basename} to ${lib.name}`);


//       // const relatvie = this.getRelative(fileAbs);
//       // if (eventName === 'unlink') {
//       //   // console.log(`unlink: ${relatvie}`)
//       //   if (indexes[libName].includes(relatvie)) {
//       //     indexes[libName] = indexes[libName].filter(f => f !== relatvie);
//       //     rewrite = true;
//       //   }
//       // } else {
//       //   // console.log(`link: ${relatvie}`)
//       //   if (!indexes[libName].includes(relatvie)) {
//       //     indexes[libName].push(relatvie);
//       //     rewrite = true;
//       //   }
//       // }
//     }
//     // if (rewrite) {
//     //   this.rewriteIndexForLibraries();
//     // }


//   }, 1000)



//   private getLibBasenameFromPath(fileAbs: string) {
//     const libName = _.first((fileAbs.replace(`${this.base}/`, '')).split('/'));
//     return libName;
//   }

//   private getRelative(fileAbs: string) {
//     const libName = this.getLibBasenameFromPath(fileAbs);
//     const relatvie = fileAbs.replace(`${this.base}/${libName}/`, '');
//     return relatvie;
//   }

//   private rewriteIndexForLibraries() {
//     const filePath = 'index.d.ts';
//     for (const libChild of this.project.libraries) {
//       Helpers.writeFile(libChild.pathFor(filePath), `
// // THIS FILE IS GENERATED DO NOT MODIFY
// ${(indexes[libChild.basename] as string[] || []).filter(exp => exp !== filePath).map(exp => {
//         return `export * from "./${exp.replace(/\.ts$/, '')}";`
//       }).join('\n')}
// // THIS FILE IS GENERATED DO NOT MODIFY
//       `)
//     }
//   }


//   @IncCompiler.methods.AsyncAction()
//   async asyncAction(event: IncCompiler.Change) {
//     // console.log({ event })
//     console.log(`ASYNC ${event.eventName}: ${event.fileAbsolutePath}`);

//     if (event.eventName === 'unlink') {
//       this.files = this.files.filter(f => f === event.fileAbsolutePath)
//     }
//     if (event.eventName === 'add') {
//       this.files.push(event.fileAbsolutePath);
//     }
//     if (event.eventName === 'change') {
//       this.files.push(event.fileAbsolutePath);
//     }

//     if (event.eventName === 'unlinkDir') {
//       for (const fileAbs of this.files.filter(f => f.startsWith(event.fileAbsolutePath))) {
//         this.filesToRebuildIndex.push({
//           eventName: 'unlink',
//           fileAbs,
//         });
//       }
//     } else {
//       this.filesToRebuildIndex.push({
//         eventName: event.eventName,
//         fileAbs: event.fileAbsolutePath
//       });
//     }
//     this.rebuildIndex();
//   }

//   private files: string[] = [];


//   async syncAction(files: string[], initalParams: IncrementaBuildOptions) {
//     console.log(`syncAction for ${this.project.name} base: ${this.base}`)
//     files = files.filter(f => f.endsWith('.ts'));
//     this.files = files;

//     for (const fileAbs of files) {

//       const libName = _.first((fileAbs.replace(`${this.base}/`, '')).split('/'));
//       if (_.isUndefined(indexes[libName])) {
//         indexes[libName] = [];
//       }
//       indexes[libName].push(this.getRelative(fileAbs));
//     }
//     this.rewriteIndexForLibraries();
//   }

//   // private copyFiles(lib: Project) {
//   //   Helpers.info(`copying data to node_modules`);
//   //   const locks = this.project.libraries.map(c => crossPlatformPath([this.projectLibrariesFolder, c.basename, 'reload.lock']));
//   //   // console.log({ locks })
//   //   const filesFromDist = [
//   //     ...locks,
//   //     ...Helpers.filesFrom([this.projectLibrariesFolder, lib.basename], true),
//   //   ];

//   //   for (const fileAbsolutePath of filesFromDist) {
//   //     this.copyFileToNodeModules(fileAbsolutePath, true);
//   //   };
//   //   Helpers.taskDone(`Copying complete`);
//   // }

//   // private locationsForNodeModules: string[];

//   // private copyFileToNodeModules(source: string, bulkCopy: boolean, deleteFile = false) {
//   //   if ((path.basename(source) === 'reload.lock')) {
//   //     deleteFile = true;
//   //   }
//   //   const relative = crossPlatformPath(source).replace(`${this.projectLibrariesFolder}/`, '');
//   //   const basename = _.first(relative.split('/'));
//   //   const lib = this.project.libraries.find(f => f.basename === basename);
//   //   if (lib) {
//   //     const realName = lib.name;
//   //     const destArr = this.locationsForNodeModules.map(loc => crossPlatformPath([
//   //       loc,
//   //       config.folder.node_modules,
//   //       realName,
//   //       relative.split('/').slice(1).join('/')
//   //     ]));
//   //     // if (!bulkCopy) {
//   //     //   console.log({ destArr })
//   //     // }
//   //     for (const dest of destArr) {
//   //       if (!dest.includes('/e2e/')) {

//   //         if (deleteFile) {
//   //           Helpers.removeFileIfExists(dest);
//   //         } else {
//   //           // console.log(`copy ${dest}`)
//   //           Helpers.copyFile(source, dest);
//   //         }
//   //       }
//   //     }

//   //   }


//   // }

// }
