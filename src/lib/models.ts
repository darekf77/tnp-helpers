//#region imports
import { ChildProcess, execSync } from 'child_process';

import { Helpers, UtilsTerminal } from 'tnp-core/src';
import { CoreModels, _ } from 'tnp-core/src';

import type { BaseProject, TypeOfCommit } from './base';
import type { BaseProcessManger } from './base/classes/base-process-manager';
//#endregion

//#region base project type
export type BaseProjectType = CoreModels.BaseProjectType;
export const BaseProjectTypeArr = CoreModels.BaseProjectTypeArr;
//#endregion

//#region ng project
/**
 * Angular project type
 */
export type NgProject = {
  projectType: 'library' | 'application';
  /**
   * where ng-packagr.json is located, tsconfig etc.
   */
  root: string;
  /**
   * Source code project
   */
  sourceRoot: string;
  prefix: string;
};

//#endregion

//#region library build options
export type LibraryBuildCommandOptions = {
  watch?: boolean;
};
//#endregion

//#region libraries build options
export type LibrariesBuildOptions<PROJECT extends BaseProject = BaseProject> = {
  strategy?: 'link' | 'copy';
  /**
   * by default we are copying all libraries to node_modules of itself
   */
  copylink_to_node_modules?: string[];
  releaseBuild?: boolean;
  /**
   * override build options for specific libraries
   * @todo
   */
  libraries?: PROJECT[];
  outputLineReplace?: (
    libForOutput: PROJECT,
    useExternalProvidedLibs: boolean,
  ) => (line: string) => string;
  useLastUserConfiguration?: boolean;
};
//#endregion

//#region test build options
export type TestBuildOptions = {
  onlySpecyficFiles?: string[];
  updateSnapshot?: boolean;
};
//#endregion

//#region change log data
export interface ChangelogData {
  changes: string[];
  version: string;
  date: string;
}
//#endregion

//#region push process options
export interface PushProcessOptions {
  force?: boolean;
  typeofCommit?: TypeOfCommit;
  mergeUpdateCommits?: boolean;
  askToConfirmPush?: boolean;
  askToConfirmCommit?: boolean;
  skipLint?: boolean;
  askToConfirmBranchChange?: boolean;
  origin?: string;
  args?: string[];
  setOrigin?: 'ssh' | 'http';
  exitCallBack?: () => void;
  forcePushNoQuestion?: boolean;
  overrideCommitMessage?: string;
  commitMessageRequired?: boolean;
  /**
   * only needed when push github
   * and I forgot to add my username before issue
   * taon pfix proper input my-repo#344
   * that should be
   * taon pfix proper input my-username/my-repo#344
   */
  currentOrigin?: string;
  skipChildren?: boolean;
  noExit?: boolean;
}
//#endregion

//#region command config
export class CommandConfig {
  static from(config: CommandConfig): CommandConfig {
    return new CommandConfig(config as any);
  }
  private constructor(data: CommandConfig) {
    Object.keys(data).forEach(key => {
      this[key] = data[key];
    });
  }
  name: string;
  cmd: string;

  headerMessageWhenActive?: string;
  /**
   * If true, the output will be stored in a buffer and displayed when requested.
   * Default: true
   */
  useDataBuffer?: boolean;
  /**
   * Process that should be started
   * before this process starts.
   */
  shouldBeActiveOrAlreadyBuild?: CommandConfig[] = [];
  goToNextCommandWhenOutput?:
    | string
    | {
        stdoutContains?: string | string[];
        stderrContains?: string | string[];
      };
}
//#endregion

//#region process manager config
export interface ProcessManagerConfig<PROJECT> {
  title: string;
  header?: string;
  commands: CommandConfig[];
  /**
   * Default: false
   * If false - after first selection of processes, it will be not possible
   * to add new processes to build and build will be done after
   * all processes are done.
   */
  watch?: boolean;
}
//#endregion

//#region command process state
export enum CommandProcessState {
  NOT_STARTED = 'not-started',
  WAITING_TO_START = 'waiting-to-start',
  RUNNING = 'running',
  FINISHED_AND_RUNNING = 'finished-and-running', // only for watch mode
  FINISHED = 'finished', // only for normal mode
}
//#endregion

//#region command process run options
export interface CommandProcessRunOptions {
  progress?: (n: number, total: number) => void;
  resolveNextProcess?: (
    currentProcess: CommandProcess,
  ) => Promise<CommandProcess>;
  resolveWhenFinish?: boolean;
}
//#endregion

//#region command process
export class CommandProcess {
  //#region fields and getters
  private state: CommandProcessState = CommandProcessState.NOT_STARTED;
  public readonly child_process?: ChildProcess;

  protected get cmd(): string {
    return this.config.cmd;
  }

  public get name(): string {
    return this.config.name;
  }

  get headerMessageWhenActive(): string | undefined {
    return this.config.headerMessageWhenActive;
  }

  get pid(): number | undefined {
    return this.child_process.pid;
  }

  get isFinished(): boolean {
    return [
      CommandProcessState.FINISHED,
      CommandProcessState.FINISHED_AND_RUNNING,
    ].includes(this.state);
  }

  get isRunning(): boolean {
    return [
      CommandProcessState.RUNNING,
      CommandProcessState.FINISHED_AND_RUNNING,
    ].includes(this.state);
  }

  get isWaitingToStart(): boolean {
    return this.state === CommandProcessState.WAITING_TO_START;
  }

  markForStart(): void {
    if (this.isRunning || this.isWaitingToStart) {
      console.warn(`Already running or waiting to start: ${this.name}`);
      return;
    }
    this.state = CommandProcessState.WAITING_TO_START;
  }

  //#endregion
  public dependenciesProcesses: CommandProcess[] = [];

  //#region constructor
  constructor(
    private project: BaseProject,
    private config: CommandConfig,
    private manager: BaseProcessManger,
  ) {}
  //#endregion

  //#region run

  async start(options?: CommandProcessRunOptions): Promise<void> {
    //#region @backendFunc
    const { progress, resolveWhenFinish } = options || {};

    this.state = CommandProcessState.RUNNING;
    // console.log('Starting process:', this.name);

    await new Promise<void>(async resolve => {
      const finishSyncCallback = async (): Promise<void> => {
        if (resolveWhenFinish) {
          resolve();
        }
        if (CommandProcessState.RUNNING) {
          if (this.manager.watch) {
            this.state = CommandProcessState.FINISHED_AND_RUNNING;
          } else {
            this.state = CommandProcessState.FINISHED;
          }
        }
      };

      // console.log(`Running command: ${this.cmd}`);

      await Helpers.execute(this.cmd, this.project.location, {
        resolvePromiseMsg: {
          stderr: _.isString(this.config.goToNextCommandWhenOutput)
            ? this.config.goToNextCommandWhenOutput
            : this.config.goToNextCommandWhenOutput?.stderrContains,
          stdout: _.isString(this.config.goToNextCommandWhenOutput)
            ? this.config.goToNextCommandWhenOutput
            : this.config.goToNextCommandWhenOutput?.stdoutContains,
        },
        biggerBuffer: true,
        resolvePromiseMsgCallback: {
          stderr: finishSyncCallback,
          stdout: finishSyncCallback,
          exitCode: code => {
            if (this.manager.watch) {
              // TODO @LAST handle errors in watch mode
              this.state = CommandProcessState.NOT_STARTED; // TODO maybe ERROR state better
              this.manager.startedProcesses.delete(this);
              resolve();
            } else {
              process.exit(code); // exit main process
            }
          },
        },
        askToTryAgainOnError: true,
        onChildProcessChange: (child_process: ChildProcess) => {
          // @ts-expect-error overriding readonly property
          this.child_process = child_process;
        },
        hideOutput: this.manager.hideOutput,
        outputBuffer: this.manager.outputBuffer,
      });

      if (!resolveWhenFinish) {
        resolve();
      }
    });

    //#endregion
  }
  //#endregion

  //#region stop
  async stop(): Promise<void> {
    //#region @backendFunc
    if (!this.manager.watch) {
      console.warn(`Can't stop process in normal mode: ${this.name}`);
      await UtilsTerminal.wait(1);
      return;
    }

    this.state = CommandProcessState.NOT_STARTED;
    this.manager.startedProcesses.delete(this);

    if (
      ![
        CommandProcessState.RUNNING,
        CommandProcessState.FINISHED_AND_RUNNING,
      ].includes(this.state)
    ) {
      console.warn(`

        Can't stop process that is not running: ${this.name}

      `);
      await UtilsTerminal.wait(1);
      return;
    }

    try {
      if (this.pid) {
        if (process.platform === 'win32') {
          execSync(`taskkill /PID ${this.pid} /T /F`);
        } else {
          process.kill(-this.pid);
        }
      }
    } catch (error) {
      console.error(`Error while stopping process: ${this.name}`);
      console.error(error);
    }

    //#endregion
  }
  //#endregion
}
//#endregion
