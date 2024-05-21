import { Adapter, SyncAdapter } from '../core/Low'

export class Memory<T> implements Adapter<T> {
  __data: T | null = null

  read(): Promise<T | null> {
    return Promise.resolve(this.__data)
  }

  write(obj: T): Promise<void> {
    this.__data = obj
    return Promise.resolve()
  }
}

export class MemorySync<T> implements SyncAdapter<T> {
  __data: T | null = null

  read(): T | null {
    return this.__data || null
  }

  write(obj: T): void {
    this.__data = obj
  }
}
