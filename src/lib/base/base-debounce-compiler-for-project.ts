import { BaseProject } from './base-project';
import { BaseCompilerForProject } from './base-compiler-for-project';
import { ChangeOfFile } from 'incremental-compiler/src';
import { _ } from 'tnp-core/src';

export abstract class BaseDebounceCompilerForProject<
  ADDITIONAL_DATA = any,
  PROJECT extends BaseProject = BaseProject,
> extends BaseCompilerForProject<ADDITIONAL_DATA, PROJECT> {
  protected initalParams: ADDITIONAL_DATA;
  abstract action({
    changeOfFiles,
    asyncEvent,
  }: {
    changeOfFiles: ChangeOfFile[];
    asyncEvent: boolean;
  });

  /**
   * @deprecated use action() instead
   */
  public async syncAction(
    absFilesPathes: string[],
    initalParams: ADDITIONAL_DATA,
  ): Promise<void> {
    this.initalParams = initalParams;
    return await this.action({
      changeOfFiles: absFilesPathes.map(
        fileAbsolutePath => new ChangeOfFile(fileAbsolutePath, 'change'),
      ),
      asyncEvent: false,
    });
  }

  private lastAsyncFilesChanges: ChangeOfFile[] = [];
  private debounceAction = _.debounce(() => {
    const changeOfFiles = this.lastAsyncFilesChanges;
    this.lastAsyncFilesChanges = [];
    this.action({
      changeOfFiles,
      asyncEvent: true,
    });
  });

  /**
   * @deprecated use action() instead
   */
  public async asyncAction(
    asyncEvents: ChangeOfFile,
    initalParams?: ADDITIONAL_DATA,
  ): Promise<void> {
    this.lastAsyncFilesChanges.push(asyncEvents);
    await this.debounceAction();
  }
}
