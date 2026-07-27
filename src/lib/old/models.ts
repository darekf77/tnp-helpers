import { CoreModels } from 'tnp-core/src';

import type { ExecCommandType } from './execute-command';

export interface CommandType {
  command?: string;
  exec?: ExecCommandType;
  title?: string;
  group?: string;
  hideContextMenu?: boolean;
  options?: ProcesOptions;
  isDefaultBuildCommand?: boolean;
}

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
  taonNonInteractive?: boolean;

  debug?: boolean;
  showOutputDataOnSuccess?: boolean;
  showSuccessMessage?: boolean;
  askBeforeExecute?: boolean;
  resolveVariables?: ResolveVariable[];
};
