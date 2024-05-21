import { SyncAdapter } from '../../core/Low'

export class WebStorage<T> implements SyncAdapter<T> {
  __key: string
  __storage: Storage

  constructor(key: string, storage: Storage) {
    this.__key = key
    this.__storage = storage
  }

  read(): T | null {
    const value = this.__storage.getItem(this.__key)

    if (value === null) {
      return null
    }

    return JSON.parse(value) as T
  }

  write(obj: T): void {
    this.__storage.setItem(this.__key, JSON.stringify(obj))
  }
}
