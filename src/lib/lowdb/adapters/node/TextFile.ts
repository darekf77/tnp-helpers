import { PathLike, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { path } from 'tnp-core/src';

import { Writer } from './steno'

import { Adapter, SyncAdapter } from '../../core/Low'

export class TextFile implements Adapter<string> {
  __filename: PathLike
  __writer: Writer

  constructor(filename: PathLike) {
    this.__filename = filename
    this.__writer = new Writer(filename)
  }

  async read(): Promise<string | null> {
    let data

    try {
      data = await readFile(this.__filename, 'utf-8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw e
    }

    return data
  }

  write(str: string): Promise<void> {
    return this.__writer.write(str) as any;
  }
}

export class TextFileSync implements SyncAdapter<string> {
  __tempFilename: PathLike
  __filename: PathLike

  constructor(filename: PathLike) {
    this.__filename = filename
    const f = filename.toString()
    this.__tempFilename = path.join(path.dirname(f), `.${path.basename(f)}.tmp`)
  }

  read(): string | null {
    let data

    try {
      data = readFileSync(this.__filename, 'utf-8')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw e
    }

    return data
  }

  write(str: string): void {
    writeFileSync(this.__tempFilename, str)
    renameSync(this.__tempFilename, this.__filename)
  }
}
