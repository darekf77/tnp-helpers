import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';

//#region command config
export class CommandConfig {
  static from(config: Partial<CommandConfig>): CommandConfig {
    return new CommandConfig(config);
  }
  private constructor(private data: Partial<CommandConfig>) {
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
  dependencyAllShouldBeActive?: CommandConfig[] = [];
  dependencyAtLeaseOneShouldBeActive?: CommandConfig[] = [];
  goToNextCommandWhen?: {
    stdoutContains?: string | string[];
    stderrContains?: string | string[];
  };
}
//#endregion

export class BaseProcessManger<
  PROJECT extends Partial<BaseProject<any, any>> = Partial<
    BaseProject<any, any>
  >,
> extends BaseFeatureForProject {
  static from<PROJECT = BaseProject<any, any>>(options: {
    project: PROJECT;
    title: string;
    header?: string;
    commands: CommandConfig[];
    watch?: boolean;
  }): BaseProcessManger<PROJECT> {
    return new BaseProcessManger(options.project as any);
  }

  private constructor(project: PROJECT) {
    super(project as any);
  }
}
