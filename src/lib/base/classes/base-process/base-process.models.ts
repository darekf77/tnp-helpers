export type BaseProcessState =
  | 'created'
  | 'starting'
  | 'restarting'
  | 'active'
  | 'killing'
  | 'killed'
  | 'ended-with-error'
  | 'ended-ok';
export type BaseProcessAction = 'start' | 'stop';

export interface BaseProcessStartOptions {
  command: string;
  cwd: string;
}
