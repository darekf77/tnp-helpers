import { _, path, crossPlatformPath } from 'tnp-core';
import { describe, before, beforeEach, it } from 'mocha';
import { expect } from 'chai';
import { Helpers } from '../index';

// const instance = BrowserDB.instance;
const tempFilePath = crossPlatformPath(
  path.join(crossPlatformPath(process.cwd()), 'tmp-file-for-test.json5')
);
const tempFilePath2 = crossPlatformPath(
  path.join(crossPlatformPath(process.cwd()), 'tmp-file-for-test2.json5')
);
let first = 'world';
let second = 'poland';
let json5Test = `
    {
      // this is hello world
      'hello': '${first}'
    }
    `;

let json5Test2 = `
    {
      // this is hello world
      'hello': '${second}'
    }
    `;


describe('taon-helpers json5', () => {

  beforeEach(() => {
    Helpers.removeFileIfExists(tempFilePath);
    first = 'world';
    second = 'poland';
    json5Test = `
    {
      // this is hello world
      'hello': '${first}'
    }
    `;

    json5Test2 = `
    {
      // this is hello world
      'hello': '${second}'
    }
    `;

  })

  it('Should properly hand instance, read and write of json 5', async () => {
    Helpers.writeFile(tempFilePath, json5Test);
    Helpers.writeFile(tempFilePath2, json5Test2);
    const instanceJsont = Helpers.json5.fromFile<{ hello: string; }>(tempFilePath);
    expect(instanceJsont.readOnlyData.hello).to.be.eq(first);
    instanceJsont.update({
      hello: second
    });
    instanceJsont.save()
    const inst2 = Helpers.json5.fromFile<{ hello: string; }>(tempFilePath);
    expect(inst2.readOnlyData.hello).to.be.eq(instanceJsont.readOnlyData.hello);
  })

  it('Should not allow to modify readonly data', async () => {
    Helpers.writeFile(tempFilePath, json5Test);
    const instanceJsont = Helpers.json5.fromFile<{ hello: string; }>(tempFilePath);
    let errorDuringModify = false;
    try {
      instanceJsont.readOnlyData.hello = 'asd';
    } catch (error) {
      errorDuringModify = true;
    }
    expect(errorDuringModify).to.be.true;
  })




})
