import { PathLike } from 'fs'

import { Adapter, SyncAdapter } from '../../core/Low'
import { TextFile, TextFileSync } from './TextFile'

export class DataFile<T> implements Adapter<T> {
  __adapter: TextFile
  __parse: (str: string) => T
  __stringify: (data: T) => string

  constructor(
    filename: PathLike,
    {
      parse,
      stringify,
    }: {
      parse: (str: string) => T
      stringify: (data: T) => string
    },
  ) {
    this.__adapter = new TextFile(filename)
    this.__parse = parse
    this.__stringify = stringify
  }

  async read(): Promise<T | null> {
    const data = await this.__adapter.read()
    if (data === null) {
      return null
    } else {
      return this.__parse(data)
    }
  }

  write(obj: T): Promise<void> {
    return this.__adapter.write(this.__stringify(obj))
  }
}

export class DataFileSync<T> implements SyncAdapter<T> {
  __adapter: TextFileSync
  __parse: (str: string) => T
  __stringify: (data: T) => string

  constructor(
    filename: PathLike,
    {
      parse,
      stringify,
    }: {
      parse: (str: string) => T
      stringify: (data: T) => string
    },
  ) {
    this.__adapter = new TextFileSync(filename)
    this.__parse = parse
    this.__stringify = stringify
  }

  read(): T | null {
    const data = this.__adapter.read()
    if (data === null) {
      return null
    } else {
      return this.__parse(data)
    }
  }

  write(obj: T): void {
    this.__adapter.write(this.__stringify(obj))
  }
}
