import {
  _, Helpers
} from 'tnp-core';
import { config } from 'tnp-config';
import * as json5 from 'json5';
import * as json5Writer from 'json10-writer';
import * as glob from 'glob';


export class JSON5Helpers<STRUCTURE = {}> {
  private isDataReadFirstTime = false;
  constructor(
    private filePath: string,
    private defaultValue = {},
  ) {

  }

  private fileContent: string;
  get readOnlyData(): STRUCTURE {
    if (!this.isDataReadFirstTime) {
      this.isDataReadFirstTime = true;
      this.read();
    }
    try {
      const parsed = json5.parse(this.fileContent);
      return Object.freeze(parsed) as any;
    } catch (error) {
      return Object.freeze(this.defaultValue) as any;
    }
  }

  private get writeInstance() {
    const writer = json5Writer.load(this.fileContent);
    return writer;
  }

  read() {
    this.fileContent = Helpers.readFile(this.filePath);
  }

  update(data: STRUCTURE) {
    const writer = this.writeInstance;
    writer.write(data);
    this.fileContent = writer.toSource();
  }

  save() {
    Helpers.writeFile(this.filePath, this.fileContent);
  }

}

export class HelpersJSON5 {
  fromFile<STRUCTURE = {}>(filePath: string): JSON5Helpers<STRUCTURE> {
    return new JSON5Helpers(filePath);
  }

  allFrom<STRUCTURE = {}>(folderPath: string): JSON5Helpers<STRUCTURE>[] {
    return glob.sync(`${folderPath}/*.${config.file.meta_config_md}`).map(f => {
      return this.fromFile(f);
    });
  }
}
