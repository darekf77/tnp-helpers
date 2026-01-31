import { CoreModels } from 'tnp-core/src';

import type { ExecCommandType } from './execute-command';

export  interface CommandType  {
  command?: string;
  exec?: ExecCommandType;
  title?: string;
  group?: string;
  hideContextMenu?: boolean;
  options?: ProcesOptions;
  isDefaultBuildCommand?: boolean;
};

export type ResolveVariable = {
  variable: string;
  resolveValueFromCommand?: string;
  prompt?: string;
  placeholder?: string | Function;
  variableValue?: any;
  encode?: boolean;
  options?: { option: any; label: string }[] | string;
  optionsResolved?: {
    option: any;
    label: string;
    skipNextVariableResolve?: boolean;
  }[];
  useResultAsLinkAndExit?: boolean;
  exitWithMessgeWhenNoOptions?: string;
  /**
   * { label: 'action item !!!', option: { action: 'STRING_SECRET_CODE' } }
   * { label: 'normal item', option: < primitive value > }
   */
  fillNextVariableResolveWhenSelectedIsActionOption?: boolean;
};

export type ProcesOptions = {
  progressLocation?: 'notification' | 'statusbar';
  findNearestProject?: boolean;
  findNearestProjectWithGitRoot?: boolean;
  findNearestProjectType?: CoreModels.LibType;
  findNearestProjectTypeWithGitRoot?: CoreModels.LibType;
  syncProcess?: boolean;
  reloadAfterSuccesFinish?: boolean;
  cancellable?: boolean;
  titleWhenProcessing?: string;
  tnpNonInteractive?: boolean;
  tnpShowProgress?: boolean;
  debug?: boolean;
  showOutputDataOnSuccess?: boolean;
  showSuccessMessage?: boolean;
  askBeforeExecute?: boolean;
  resolveVariables?: ResolveVariable[];
};

/**
 * @deprecated
 */
export type PROGRESS_DATA_TYPE = 'info' | 'error' | 'warning' | 'event';

/**
 * @deprecated
 */
export interface IProgressData {
  /**
   * How man percent of progress
   */
  value?: number;
  msg?: string;
  type?: PROGRESS_DATA_TYPE;
  date?: Date;
}

/**
 * @deprecated
 */
export class ProgressData implements IProgressData {
  public static resolveFrom(
    chunk: string,
    callbackOnFounded?: (json: ProgressData) => any,
    checkSplit = true,
  ): ProgressData[] {
    let progress;
    let res: ProgressData[] = [];
    if (typeof chunk !== 'string') {
      return [];
    }
    chunk = chunk.trim();

    if (checkSplit) {
      const split = chunk.split(/\r\n|\n|\r/);
      if (split.length > 1) {
        // console.log('split founded', split)
        split.forEach(s => {
          res = res.concat(this.resolveFrom(s, callbackOnFounded, false));
        });
        return res;
      }
    }

    if (/\[\[\[.*\]\]\]/g.test(chunk)) {
      chunk = chunk.replace(/^\[\[\[/g, '').replace(/\]\]\]$/g, '');
      progress = chunk;
    }
    if (typeof progress !== 'undefined') {
      try {
        const p = JSON.parse(progress);
        const single = Object.assign(new ProgressData(), p);
        res = res.concat([single]);
        if (typeof callbackOnFounded === 'function') {
          callbackOnFounded(single);
        }
      } catch (err) {
        console.log(err);
        console.error(`ProgresssBarData: fail to parse "${progress}"`);
      }
    }
    return res;
  }

  constructor(
    public value: number = 0,
    public msg: string = '',

    public type: PROGRESS_DATA_TYPE = 'event',
    public date: Date = new Date(),
  ) {}
}
