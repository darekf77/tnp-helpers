//#region   @backend
import { WebStorage } from './WebStorage'

export class SessionStorage<T> extends WebStorage<T> {
  constructor(key: string) {
    super(key, sessionStorage)
  }
}
//#endregion
