import { BaseProject } from './base-project';
import { BaseCompilerForProject } from './base-compiler-for-project';
import { ChangeOfFile } from 'incremental-compiler/src';
import { _, Utils } from 'tnp-core/src';
import { Helpers } from '../index';

export abstract class BaseDebounceCompilerForProject<
  ADDITIONAL_DATA = any,
  PROJECT extends BaseProject = BaseProject,
> extends BaseCompilerForProject<ADDITIONAL_DATA, PROJECT> {
  protected initalParams: ADDITIONAL_DATA;
  /**
   * default debounce time is 1s
   */
  protected debounceTime = 1000;
  abstract action({
    changeOfFiles,
    asyncEvent,
  }: {
    changeOfFiles: ChangeOfFile[];
    asyncEvent: boolean;
  });

  /**
   * current files that are in project
   */
  protected exitedFilesAbsPathes: string[] = [];

  /**
   * @deprecated use action() instead
   */
  public async syncAction(
    absFilesPathes: string[],
    initalParams: ADDITIONAL_DATA,
  ): Promise<void> {
    this.initalParams = initalParams || ({} as any);
    this.exitedFilesAbsPathes = absFilesPathes;
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
  }, this.debounceTime);

  /**
   * @deprecated use action() instead
   */
  public async asyncAction(
    asyncEvents: ChangeOfFile,
    initalParams?: ADDITIONAL_DATA,
  ): Promise<void> {
    this.lastAsyncFilesChanges.push(asyncEvents);
    if (asyncEvents.eventName === 'unlink') {
      this.exitedFilesAbsPathes = this.exitedFilesAbsPathes.filter(
        f => f !== asyncEvents.fileAbsolutePath,
      );
    } else if (asyncEvents.eventName === 'unlinkDir') {
      this.exitedFilesAbsPathes = this.exitedFilesAbsPathes.filter(
        f =>
          !f.startsWith(asyncEvents.fileAbsolutePath.replace(/\/$/, '') + '/'),
      );
    } else {
      this.exitedFilesAbsPathes.push(asyncEvents.fileAbsolutePath);
      this.exitedFilesAbsPathes = Utils.uniqArray(this.exitedFilesAbsPathes);
    }
    await this.debounceAction();
  }
}
