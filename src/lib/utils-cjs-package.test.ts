// adjust import
import { UtilsCjsPackage } from './utils-cjs-package';

describe('UtilsCjsPackage.findConditionalPath', () => {
  it('returns string value directly', () => {
    expect(UtilsCjsPackage.findConditionalPath('./index.js', ['import'])).toBe(
      './index.js',
    );
  });

  it('returns undefined for undefined', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(undefined, ['import']),
    ).toBeUndefined();
  });

  it('returns undefined for empty object', () => {
    expect(UtilsCjsPackage.findConditionalPath({}, ['import'])).toBeUndefined();
  });

  it('returns preferred condition', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          import: './esm.js',
          require: './cjs.js',
        },
        ['import', 'require'],
      ),
    ).toBe('./esm.js');
  });

  it('falls back to second preferred condition', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          require: './cjs.js',
        },
        ['import', 'require'],
      ),
    ).toBe('./cjs.js');
  });

  it('recursively resolves nested conditions', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          import: {
            browser: './browser.js',
          },
        },
        ['import', 'browser'],
      ),
    ).toBe('./browser.js');
  });

  it('searches arrays until first match', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        [undefined as any, { require: './cjs.js' }, './fallback.js'],
        ['require'],
      ),
    ).toBe('./cjs.js');
  });

  it('returns first matching array entry', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(['./a.js', './b.js'], ['import']),
    ).toBe('./a.js');
  });

  it('returns undefined when array contains no match', () => {
    expect(
      UtilsCjsPackage.findConditionalPath([{ foo: {} }], ['import']),
    ).toBeUndefined();
  });

  it('falls back to traversing custom conditions', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          electron: {
            worker: './worker.js',
          },
        },
        ['import', 'require'],
      ),
    ).toBe('./worker.js');
  });

  it('finds nested preferred condition inside custom condition', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          electron: {
            import: './electron-esm.js',
          },
        },
        ['import'],
      ),
    ).toBe('./electron-esm.js');
  });

  it('prefers preferred conditions over fallback traversal', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          import: './esm.js',
          custom: './custom.js',
        },
        ['import'],
      ),
    ).toBe('./esm.js');
  });

  it('handles deeply nested mixed structures', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          node: [
            {},
            {
              browser: {
                import: './deep.js',
              },
            },
          ],
        },
        ['import', 'browser'],
      ),
    ).toBe('./deep.js');
  });

  it('returns undefined when nothing resolves to a string', () => {
    expect(
      UtilsCjsPackage.findConditionalPath(
        {
          import: {},
          require: [],
          custom: {
            foo: {},
          },
        },
        ['import', 'require'],
      ),
    ).toBeUndefined();
  });
});
