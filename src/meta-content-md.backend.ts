import * as glob from 'glob';
import { config } from 'tnp-config';

export class MetaMd {
  constructor(
    private readonly filePath: string,
  ) {

  }

  private extractJSON() {

  }

  private extractFileContent() {

  }

  private extractTestContent() {

  }

  get originalFilePath(): MetaMdJSON {
    return void 0;
  }

  get json(): MetaMdJSON {
    return void 0;
  }

  get fileContent(): MetaMdJSON {
    return void 0;
  }

  get testContent(): MetaMdJSON {
    return void 0;
  }

  recreateIn(cwd = process.cwd()) {
    // recreat whole structure

  }

  update() {
    return {
      json: (data: MetaMdJSON) => {
        return void 0;
      },
      fileContent: (content: string) => {
        return void 0;
      },
      testContent: (string) => {
        return void 0;
      }
    }
  }

}

export interface MetaMdJSONProject {
  githash?: string;
  isLinkFrom?: string;
}

export interface MetaMdJSON {
  filepath: string;
  projects: { [projPath: string]: MetaMdJSONProject; }
}

export class MetaContentMd {
  from(filePath: string): MetaMd {
    return new MetaMd(filePath);
  }

  allFrom(folderPath: string): MetaMd[] {
    return glob.sync(`${folderPath}/*.${config.file.meta_config_md}`).map(f => {
      return this.from(f);
    });
  }
}

