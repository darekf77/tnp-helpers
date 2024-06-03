//#region @backend
import { LocalStorage } from '../adapters/browser/LocalStorage'
import { SessionStorage } from '../adapters/browser/SessionStorage'
import { LowSync } from '../index'

export function LocalStoragePreset<Data>(
  key: string,
  defaultData: Data,
): LowSync<Data> {
  const adapter = new LocalStorage<Data>(key)
  const db = new LowSync<Data>(adapter, defaultData)
  db.read()
  return db
}

export function SessionStoragePreset<Data>(
  key: string,
  defaultData: Data,
): LowSync<Data> {
  const adapter = new SessionStorage<Data>(key)
  const db = new LowSync<Data>(adapter, defaultData)
  db.read()
  return db
}
//#endregion
