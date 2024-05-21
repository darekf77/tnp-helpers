// With this adapter, calling `db.write()` will do nothing.
// One use case for this adapter can be for tests.
import { LowSync, MemorySync, SyncAdapter } from '../index'
import { JSONFileSync } from '../node'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'test' | 'dev' | 'prod'
    }
  }
}

type Data = Record<string, unknown>
const defaultData: Data = {}
const adapter: SyncAdapter<Data> =
  process.env.NODE_ENV === 'test'
    ? new MemorySync<Data>()
    : new JSONFileSync<Data>('db.json')

const db = new LowSync<Data>(adapter, defaultData)
db.read()
// Rest of your code...
