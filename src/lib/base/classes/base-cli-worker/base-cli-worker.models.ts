import { TaonBaseClass } from 'taon/src';
import { _ } from 'tnp-core/src';

interface BaseCliWorkerOptionCallable {
  /**
   * Name of the function from which the option was called
   */
  calledFrom: string;
}

export class BaseCliWorkerConfigGetContextOptions {
  /**
   * default localhost
   */
  declare ipAddressOfTaonInstance?: string;
  /**
   * if null nothing is used as port (ip address will be clean)
   */
  declare port?: number | null;
}

/**
 * Default mode: DETACHED_CHILD_PROCESS
 */
export enum BaseCLiWorkerStartMode {
  CHILD_PROCESS = 'child',
  IN_CURRENT_PROCESS = 'process',
  DETACHED_WINDOW = 'window',
}

export class BaseCLiWorkerStartParams {
  /**
   * Start mode
   * Default mode DETACHED_CHILD_PROCESS
   */
  declare mode: BaseCLiWorkerStartMode;
  declare restart?: boolean;
  declare kill?: boolean;
}

export class BaseCliMethodOptions
  extends TaonBaseClass<BaseCliMethodOptions>
  implements BaseCliWorkerOptionCallable
{
  static from(opt?: Partial<BaseCliMethodOptions>): BaseCliMethodOptions {
    opt = opt ?? {};
    opt.cliParams = opt.cliParams ?? ({} as any);
    opt.connectionOptions = opt.connectionOptions ?? {};
    const res = new BaseCliMethodOptions().clone(opt);
    res.cliParams = _.merge(new BaseCLiWorkerStartParams(), opt.cliParams);
    res.cliParams.mode =
      res.cliParams.mode || BaseCLiWorkerStartMode.CHILD_PROCESS;

    res.connectionOptions = _.merge(
      new BaseCliWorkerConfigGetContextOptions(),
      opt.connectionOptions,
    );
    return res;
  }
  declare connectionOptions?: BaseCliWorkerConfigGetContextOptions;
  declare cliParams?: BaseCLiWorkerStartParams;
  /**
   * Name of the function from which the option was called
   */
  declare calledFrom: string;
}