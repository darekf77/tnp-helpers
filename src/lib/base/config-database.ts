//#region imports
import { CoreModels, crossPlatformPath, UtilsOs } from 'tnp-core/src';
import { os } from 'tnp-core/src'; // @backend

import { HelpersTaon } from '../index';
import { Low } from '../lowdb'; // @backend

import { BaseDb } from './classes/base-db';
import type { BaseProjectResolver } from './classes/base-project-resolver';
//#endregion

const defaultDb = {
  config: {} as { [key: string]: string | number | boolean | null },
};

//#region config database ext
export abstract class ConfigDatabaseEx<T = object> {
  constructor(
    protected KEY_PATH_DB: string,
    protected configDb: ConfigDatabase,
  ) {}

  //#region get value
  public async getValue(): Promise<T | undefined> {
    //#region @backendFunc
    const db = await this.configDb.getConnection();
    let editor = db.data.config[this.KEY_PATH_DB] as any;
    return editor;
    //#endregion
  }
  //#endregion

  //#region set value
  public async setValue(v: T): Promise<T> {
    //#region @backendFunc
    const db = await this.configDb.getConnection();
    await db.update(data => (data.config[this.KEY_PATH_DB] = v as any));
    return v;
    //#endregion
  }
  //#endregion

  //#region select one value
  protected async selectOneValue(
    arrOfValues: string[],
    question = 'Select default global value',
  ): Promise<string> {
    //#region @backendFunc
    let value = await HelpersTaon.consoleGui.select(
      question,
      arrOfValues.map(name => {
        return {
          name,
          value: name,
        };
      }),
    );
    return value as any;
    //#endregion
  }
  //#endregion
}
//#endregion

//#region code editor config
export class CodeEditorConfig extends ConfigDatabaseEx<UtilsOs.Editor> {
  async getValue(): Promise<UtilsOs.Editor> {
    //#region @backendFunc
    let editor = await super.getValue();
    if (!editor) {
      editor = await this.selectCodeEditor();
    }
    return editor;
    //#endregion
  }

  async selectCodeEditor(): Promise<UtilsOs.Editor> {
    //#region @backendFunc
    let editor = await this.selectOneValue(
      UtilsOs.EditorArr,
      'Select default code editor',
    );
    await this.setValue(editor as any);
    return editor as any;
    //#endregion
  }
}
//#endregion

//#region ssh https preference config
export class SshHttpsPreferenceConfig extends ConfigDatabaseEx<CoreModels.GitConnection> {
  async getValue(): Promise<CoreModels.GitConnection> {
    //#region @backendFunc
    let editor = await super.getValue();
    if (!editor) {
      editor = await this.selectHttpOrSsh();
    }
    return editor;
    //#endregion
  }

  async selectHttpOrSsh(): Promise<CoreModels.GitConnection> {
    //#region @backendFunc
    let editor = await this.selectOneValue(
      CoreModels.GitConnectionArr,
      'Select  default git connection type',
    );
    await this.setValue(editor as any);
    return editor as any;
    //#endregion
  }
}
//#endregion

export class ConfigDatabase extends BaseDb<typeof defaultDb> {
  constructor(ins: BaseProjectResolver) {
    super(ins, 'config', defaultDb);

    // const editor = await this.codeEditor.getValue
  }

  codeEditor = new CodeEditorConfig('selected-code-editor', this);

  httpOrHttps = new CodeEditorConfig('selected-git-connection-type', this);
}
