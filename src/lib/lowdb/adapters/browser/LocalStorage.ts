//#region @backend
import { WebStorage } from './WebStorage';

export class LocalStorage<T> extends WebStorage<T> {
  constructor(key: string) {
    super(key, localStorage);
  }
}
//#endregion
