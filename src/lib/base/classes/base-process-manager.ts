//#region imports
import { _, chalk, Helpers, UtilsTerminal } from 'tnp-core/src';

import { CommandProcess, ProcessManagerConfig } from '../../models';

import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';

export { CommandConfig } from '../../models';
//#endregion

//#region custom console select/multiselect
//#region @backend
// eslint-disable-next-line import/order
const Select = require('enquirer/lib/prompts/select');
// eslint-disable-next-line import/order
const MultiSelect = require('enquirer/lib/prompts/multiselect');

const showOutputOptionLabel = 'Show output';

class CustomSelect extends Select {
  constructor(options) {
    super(options);
  }
  async keypress(char, key): Promise<any> {
    if (key.name === 'escape') {
      this.clear();
      return this.submit(showOutputOptionLabel);
    }
    return super.keypress(char, key);
  }
}

class CustomMultiSelect extends MultiSelect {
  constructor(options) {
    super(options);
  }
  async keypress(char, key): Promise<any> {
    if (key.name === 'escape') {
      this.clear();
      return this.submit([]);
    }
    return super.keypress(char, key);
  }
}
//#endregion
//#endregion

export class BaseProcessManger<
  PROJECT extends BaseProject<any, any> = BaseProject<any, any>,
> extends BaseFeatureForProject<PROJECT> {
  //#region fields and getters
  private initialOptions: ProcessManagerConfig<PROJECT>;
  private allProcesses: CommandProcess[] = [];
  private selectedProcesses: CommandProcess[] = [];
  public outputBuffer: string[] = [];
  public startedProcesses = new Set<CommandProcess>();
  public watch = false;

  //#region fields and getters / show logs
  private _showLogs: boolean = false;
  public set showLogs(value: boolean) {
    this._showLogs = value;
    this.hideOutput.stderr = !value;
    this.hideOutput.stdout = !value;
  }
  get showLogs(): boolean {
    return this._showLogs;
  }

  /**
   * special config for Helpers.executer
   */
  hideOutput = {
    stderr: !this.showLogs,
    stdout: !this.showLogs,
    acceptAllExitCodeAsSuccess: true,
  };
  //#endregion

  //#endregion

  //#region constructor
  constructor(project: PROJECT) {
    super(project as any);
  }
  //#endregion

  //#region init
  async init<PROJECT = BaseProject<any, any>>(
    initialOptions: ProcessManagerConfig<PROJECT>,
  ): Promise<void> {
    //#region @backendFunc
    this.initialOptions = initialOptions;
    this.allProcesses.length = 0;
    this.selectedProcesses.length = 0;
    this.outputBuffer = [];
    this.showLogs = false;
    this.watch = initialOptions.watch;

    initialOptions.commands.forEach(config => {
      this.allProcesses.push(new CommandProcess(this.project, config, this));
    });

    this.allProcesses.forEach(proc => {
      const config = initialOptions.commands.find(c => c.name === proc.name);
      proc.dependenciesProcesses = (
        config.shouldBeActiveOrAlreadyBuild || []
      ).map(dep => {
        return this.allProcesses.find(p => p.name === dep.name);
      });
    });

    process.on('SIGINT', async () => {
      for (const proc of this.allProcesses) {
        if (proc.isRunning) {
          console.log(`Stopping process: ${proc.name}`);
          await proc.stop();
        }
      }
      process.exit(0);
    });

    await this.buildMenu(false);
    //#endregion
  }
  //#endregion

  //#region show output
  private showOutput(): void {
    //#region @backendFunc
    console.clear();
    this.showLogs = true;
    if (!this.watch) {
      return;
    }
    console.log('Displaying output... Press Enter to stop.\n\n');
    console.log(this.outputBuffer.join('\n'));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once('data', () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      this.showLogs = false;
      this.killOrBuildMenu();
    });
    //#endregion
  }
  //#endregion

  //#region kill or build menu
  private async killOrBuildMenu(): Promise<void> {
    //#region @backendFunc

    const buildMore = 'Build more';

    const chooseAction = ' -- choose action -- ';

    while (true) {
      console.clear();

      console.log(`
       (Press ${chalk.bold('Escaped')} to show output again)
      Manage Processes (${chalk.bold('ctrl + c')} to exit)
        `);

      const runningProcesses = this.allProcesses;
      for (const proc of runningProcesses) {
        if (proc.headerMessageWhenActive) {
          if (proc.isRunning) {
            console.log(`[${chalk.bold.gray(proc.headerMessageWhenActive)}]`);
          }
          if (proc.isWaitingToStart) {
            console.log(
              chalk.italic.gray(
                `[(Scheduled to start) ${proc.headerMessageWhenActive}]`,
              ),
            );
          }
        }
      }
      console.log('\n');
      this.showLogs = false;

      const kill = chalk.bold('Kill');
      // const exit = 'Exit';

      const optionsToSchedule = this.allProcesses
        .filter(proc => proc.isWaitingToStart)
        .map(proc => {
          return `${chalk.bold('Scheduled to start')}: ${proc.name.trim()}`;
        });

      const choices = [
        chooseAction,
        ...this.allProcesses
          .filter(proc => proc.isRunning)
          .map(proc => `${kill}: ${proc.name}`),
        ...optionsToSchedule,
      ];

      const processesNotStarted = this.allProcesses.filter(
        proc => !proc.isRunning && !proc.isWaitingToStart,
      );

      if (processesNotStarted.length < this.allProcesses.length) {
        choices.push(buildMore);
      }
      choices.push(showOutputOptionLabel);
      // options.push(exit);

      const action: string = await new CustomSelect({
        message: `Select action`,
        choices: choices,
      }).run();

      if (action.startsWith(kill)) {
        const procName = action.split(':')[1].trim();
        await this.allProcesses.find(p => p.name === procName)?.stop();
      } else if (action === buildMore) {
        return this.buildMenu();
      } else if (action === showOutputOptionLabel) {
        return this.showOutput();
      }
    }
    //#endregion
  }
  //#endregion

  //#region make sure selected processes are running
  async makeSureSelectedProcessesAreRunning(): Promise<void> {
    //#region @backendFunc
    if (this.selectedProcesses.length === 0) {
      console.log('No processes selected. Returning to menu.');
      await UtilsTerminal.wait(2);
      return;
    }
    for (const proc of this.selectedProcesses) {
      proc.markForStart();
    }

    const selectedWithDependencies = this.selectedProcesses.filter(
      f => f.dependenciesProcesses?.length > 0,
    );

    const selectedWithoutDependencies = this.selectedProcesses.filter(
      f => selectedWithDependencies.indexOf(f) === -1,
    );

    for (const process of selectedWithoutDependencies) {
      if (!this.startedProcesses.has(process)) {
        this.startedProcesses.add(process);
        process.start();
      }
    }

    for (const process of selectedWithDependencies) {
      await this.startProcessWithDependencies(process, this.startedProcesses);
    }
    //#endregion
  }
  //#endregion

  //#region start process with dependencies
  private async startProcessWithDependencies(
    process: CommandProcess,
    startedProcesses = new Set<CommandProcess>(),
    parent: CommandProcess | undefined = undefined,
  ): Promise<void> {
    //#region @backendFunc
    if (startedProcesses.has(process)) {
      return; // Avoid circular dependencies or already-started processes
    }

    for (const dependency of process.dependenciesProcesses) {
      await this.startProcessWithDependencies(
        dependency,
        startedProcesses,
        process,
      );
    }

    if (!process.isRunning && !startedProcesses.has(process)) {
      startedProcesses.add(process);
      await process.start({
        resolveWhenFinish: true,
      });
    }
    //#endregion
  }
  //#endregion

  //#region build menu
  private async buildMenu(allowedToShowOutput = true): Promise<void> {
    //#region @backendFunc
    console.clear();
    const choices = this.allProcesses
      .filter(f => !f.isRunning)
      .map(proc => proc.name);

    // const { MultiSelect } = require('enquirer');
    if (this.initialOptions.header) {
      console.log(this.initialOptions.header);
    }

    while (true) {
      const selection: string[] = await new CustomMultiSelect({
        message: this.initialOptions.title,
        choices: choices,
        result(names: string[]) {
          return names;
        },
      }).run();

      if (allowedToShowOutput && selection.length === 0) {
        break;
      }

      this.selectedProcesses = selection.map(name => {
        return this.allProcesses.find(p => p.name === name);
      });
      if (this.selectedProcesses.length > 0) {
        break;
      }
    }

    this.showOutput();
    await this.makeSureSelectedProcessesAreRunning();
    //#endregion
  }
  //#endregion
}
