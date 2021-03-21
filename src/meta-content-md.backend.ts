import * as glob from 'glob';
import * as path from 'path';
import { config } from 'tnp-config';
import { Helpers } from './index';
import type { Project } from './project';


function testPart(pathToFile: string) {
  const timeHash = (+new Date).toString(36);
  return `
import * as _ from 'path';
import { describe, before, beforeEach, it } from 'mocha';
import { expect } from 'chai';
import { recreateEnvironment  } from 'node-cli-tester';

describe('es-common-module.ts test',()=> {

 it('Should pass the test with hash ${timeHash}, async  () => {
  const relativePathToFile = './${timeHash}/${pathToFile}';
   recreateEnvironment(path.join(__dirname,relativePathToFile));
   expect(true).to.not.be(false);
 })

})
  `.trim();
}

/**
 * Purpose of meta-content.md
 *
 * Solution for recreating original files/project worksapces in spec.ts
 * for every single unit-test
 */
export class MetaMd {
  static create(json: MetaMdJSON, fileContent: String, testContent?: string) {
    return create(json, fileContent, testContent);
  }
  static readonly JSON_PART = '@jsonPart';
  static readonly FILE_CONTENT_PART = '@fileContentPart';
  static readonly TEST_PART = '@testPart';
  constructor(
    private readonly filePath: string,
  ) {

  }

  get originalFilePath(): string {
    return this.json.filepath;
  }

  get readonlyMetaJson() {
    return Object.freeze(this.json);
  }

  private get json(): MetaMdJSON {
    const content = Helpers.readFile(this.filePath) || '';
    try {
      const extracted = extract(content, MetaMd.JSON_PART);
      const parsed = Helpers.parse(extracted, true);
      return parsed;
    } catch (error) {
      return {} as any;
    }
  }

  get fileContent(): string {
    const content = Helpers.readFile(this.filePath) || '';
    return extract(content, MetaMd.FILE_CONTENT_PART);
  }

  get testContent(): string {
    const content = Helpers.readFile(this.filePath) || '';
    return extract(content, MetaMd.TEST_PART);
  }

  recreateIn(cwd = process.cwd()) {
    // recreat whole structure

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

  from(originalFilePath: string, ProjectClass: typeof Project) {
    // Project.nearestTo(originalFilePath,{ findGitRoot})
    return {
      saveTo: (destinationContentMdFile: string) => {

      }
    }
  }

  instanceFrom(filePath: string): MetaMd {
    return new MetaMd(filePath);
  }

  allInstancesFrom(folderPath: string): MetaMd[] {
    return glob.sync(`${folderPath}/*.${config.file.meta_config_md}`).map(f => {
      return this.instanceFrom(f);
    });
  }
}

function create(json: any, fileContent: String, testContent?: string) {
  const metadataJSON = Helpers.parse<MetaMdJSON>(json, true);
  const ext = path.extname(metadataJSON.filepath).replace(/^\./, '');
  const filePath = metadataJSON.filepath;

  if (!testContent) {
    testContent = testPart(filePath)
  }

  return `
  \`\`\`json5 ${MetaMd.JSON_PART}
${json}
   \`\`\`

   \`\`\`${ext} ${MetaMd.FILE_CONTENT_PART}
${fileContent}
   \`\`\`

   \`\`\`ts ${MetaMd.TEST_PART}
${testContent}
   \`\`\`

    `.split('\n').map(l => {
    return l.trim().startsWith('\`\`\`') ? l.trimLeft() : l;
  }).join('\n').trim() + '\n';
}

function extract(content: string, PART_TO_FIND: string) {
  if (!content) {
    return;
  }
  const lines = [];
  const allLines = content.split('\n');
  let pushingActive = false;
  for (let index = 0; index < allLines.length; index++) {
    const orgLine = (allLines[index] || '');
    const line = orgLine.trim();
    if (pushingActive) {
      if (line.startsWith('\`\`\`')) {
        break;
      } else {
        lines.push(orgLine);
      }
    }
    if (line.startsWith('\`\`\`') && (line.search(PART_TO_FIND) !== -1)) {
      pushingActive = true;
    }
  }
  return lines.join('\n');
}
