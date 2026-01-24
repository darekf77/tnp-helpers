//#region imports
import { crossPlatformPath, UtilsOs } from 'tnp-core/src';
import { os } from 'tnp-core/src'; // @backend

import { HelpersTaon } from '../index';
import { Low } from '../lowdb'; // @backend

import { BaseDb } from './classes/base-db';
import type { BaseProjectResolver } from './classes/base-project-resolver';


//#endregion

const defaultDb = {
  config: {} as { [key: string]: string | number | boolean | null },
};

export class ConfigDatabase extends BaseDb<typeof defaultDb> {
  constructor(ins: BaseProjectResolver) {
    super(ins, 'config', defaultDb);
  }

  private get selectedCodeEditorKey(): string {
    return 'selected-code-editor';
  }

  public async selectCodeEditor(): Promise<UtilsOs.Editor> {
    //#region @backendFunc
    const db = await this.getConnection();
    let editor = await HelpersTaon.consoleGui.select(
      'Select default code editor',
      UtilsOs.EditorArr.map(name => {
        return {
          name,
          value: name,
        };
      }),
    );
    await db.update(
      data => (data.config[this.selectedCodeEditorKey] = editor as any),
    );
    return editor as any;
    //#endregion
  }

  public async getCodeEditor(): Promise<UtilsOs.Editor> {
    //#region @backendFunc
    const db = await this.getConnection();
    let editor = db.data.config[this.selectedCodeEditorKey] as any;
    if (!editor) {
      editor = await this.selectCodeEditor();
    }
    return editor;
    //#endregion
  }
}
