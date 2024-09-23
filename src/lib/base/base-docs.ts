import { BaseProject } from './base-project';
import { BaseCompilerForProject } from './base-compiler-for-project';
import { ChangeOfFile } from 'incremental-compiler/src';
import { BaseProjectType } from '../models';

export class BaseDocs<
  PROJECT extends BaseProject<
    BaseProject<any, any>,
    BaseProjectType
  > = BaseProject,
> extends BaseCompilerForProject<{}, PROJECT> {
  //#region fields & getters / docs config path
  public readonly docsConfig = 'docs-config.jsonc';
  public readonly docsConfigSchema = 'docs-config.schema.json';
  get docsConfigPath() {
    //#region @backendFunc
    return this.project.pathFor(this.docsConfig);
    //#endregion
  }
  //#endregion

  //#region fields & getters / tmp docs folder path
  public readonly tmpDocsFolder = 'tmp/temp-docs-folder';
  /**
   * mkdocs temp folder
   */
  protected get tmpDocsFolderPath() {
    //#region @backendFunc
    return this.project.pathFor(this.tmpDocsFolder);
    //#endregion
  }
  //#endregion

  //#region init
  protected async init() {
    //#region @backendFunc
    if (!this.project.hasFolder(this.tmpDocsFolder)) {
      this.project.createFolder(this.tmpDocsFolder);
    }
    if (!this.project.hasFile(this.docsConfig)) {
      this.project.writeJson(this.docsConfig, this.defaultDocsConfig());
    }
    if (!this.project.hasFile(this.docsConfigSchema)) {
      this.project.writeFile(
        this.docsConfigSchema,
        this.docsConfigSchemaContent(),
      );
    }
    this.project.vsCodeHelpers.recreateJsonSchemaForDocs();

    //#endregion
  }
  //#endregion

  //#region defaultDocsConfig
  protected defaultDocsConfig(): DocsConfig {
    //#region @backendFunc
    return {
      site_name: this.project.name,
      additionalAssets: [],
      externalDocs: {
        mdfiles: [],
        projects: [],
      },
      omitFilesPatters: [],
      priorityOrder: [],
    } as DocsConfig;
    //#endregion
  }
  //#endregion

  protected docsConfigSchemaContent(): string {
    return `{}`;
  }

  //#region constructor
  //#region @backend
  constructor(project: PROJECT) {
    super(project, {
      taskName: 'DocsProvider',
      folderPath: project.location,
      ignoreFolderPatter: [
        project.pathFor('tmp-*/**/*.*'),
        project.pathFor('tmp-*'),
        project.pathFor('dist/**/*.*'),
        project.pathFor('dist'),
        project.pathFor('browser/**/*.*'),
        project.pathFor('browser'),
        project.pathFor('websql/**/*.*'),
        project.pathFor('websql'),
      ],
      subscribeOnlyFor: ['md'],
    });
  }
  //#endregion
  //#endregion

  //#region syncAction
  async syncAction(
    absolteFilesPathes?: string[],
    initalParams?: {},
  ): Promise<void> {
    await this.init();
    console.log(`Founded files ${absolteFilesPathes?.length}`);
    // if (absolteFilesPathes.length < 10) {
    console.log(absolteFilesPathes);
    // }
  }
  //#endregion

  //#region asyncAction
  async asyncAction(
    asyncEvents: ChangeOfFile,
    initalParams?: {},
  ): Promise<void> {
    console.log('asyncAction', asyncEvents.fileAbsolutePath);
  }
  //#endregion
}

//#region DocsConfig
export interface DocsConfig {
  /**
   * override site name
   */
  site_name: string;
  /**
   * relative pathes to md files
   * for proper order
   */
  priorityOrder?: string[];
  /**
   * glob pattern to omit files
   */
  omitFilesPatters: string[];
  /**
   * relative path to the assets folders in project
   * [external assets not allowed... use externalDocs for that]
   */
  additionalAssets: string[];
  externalDocs: {
    mdfiles: {
      /**
       * path to *.md file
       * or array of paths (fallbacks pathes for the same file)
       * [in case of multiple files -> you will be ask to choose one]
       */
      path: string | string[];
      /**
       * if you want to rename something inside file
       * you can use this magic rename rules
       * example:
       *
       * framework-name => new-framework-name
       *
       * example with array:
       *
       * framework-name => new-framework-name, framework-name2 => new-framework-name2
       */
      magicRenameRules: string;
    }[];
    projects: {
      /**
       * path to project
       * or array of paths (fallbacks pathes for the same projec)
       * [in case of multiple projects -> you will be ask to choose one]
       */
      path: string;
    }[];
  };
}
//#endregion
