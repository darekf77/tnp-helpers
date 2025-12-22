//#region imports
import { crossPlatformPath } from 'tnp-core/src';

import type { BaseProjectResolver } from './classes/base-project-resolver';
import { BaseDb } from './classes/base-db';
import { Helpers } from '../index';

//#region @backend
import { Low } from '../lowdb';
import { os } from 'tnp-core/src';
//#endregion

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

  public async selectCodeEditor(): Promise<
    'code' | 'idea' | 'idea64' | string
  > {

    //#region @backendFunc
    const db = await this.getConnection();
    let editor = await Helpers.consoleGui.select(
      'Select default code editor',
      ['code', 'idea', 'idea64'].map(name => {
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

  public async getCodeEditor(): Promise<'code' | 'idea' | 'idea64' | string> {

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