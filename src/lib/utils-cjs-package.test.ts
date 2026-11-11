// adjust import
import { UtilsCjsEsmPackage } from './utils-cjs-package';

describe('UtilsCjsEsmPackage.findConditionalPath', () => {
  it('returns string value directly', () => {
    expect(UtilsCjsEsmPackage.findConditionalPath('./index.js', ['import'])).toBe(
      './index.js',
    );
  });

  it('returns undefined for undefined', () => {
    expect(
      UtilsCjsEsmPackage.findConditionalPath(undefined, ['import']),
    ).toBeUndefined();
  });

  it('returns undefined for empty object', () => {
    expect(UtilsCjsEsmPackage.findConditionalPath({}, ['import'])).toBeUndefined();
  });

  it('returns preferred condition', () => {
    expect(
      UtilsCjsEsmPackage.findConditionalPath(
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
      UtilsCjsEsmPackage.findConditionalPath(
        {
          require: './cjs.js',
        },
        ['import', 'require'],
      ),
    ).toBe('./cjs.js');
  });

  it('recursively resolves nested conditions', () => {
    expect(
      UtilsCjsEsmPackage.findConditionalPath(
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
      UtilsCjsEsmPackage.findConditionalPath(
        [undefined as any, { require: './cjs.js' }, './fallback.js'],
        ['require'],
      ),
    ).toBe('./cjs.js');
  });

  it('returns first matching array entry', () => {
    expect(
      UtilsCjsEsmPackage.findConditionalPath(['./a.js', './b.js'], ['import']),
    ).toBe('./a.js');
  });

  it('returns undefined when array contains no match', () => {
    expect(
      UtilsCjsEsmPackage.findConditionalPath([{ foo: {} }], ['import']),
    ).toBeUndefined();
  });

  it('falls back to traversing custom conditions', () => {
    expect(
      UtilsCjsEsmPackage.findConditionalPath(
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
      UtilsCjsEsmPackage.findConditionalPath(
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
      UtilsCjsEsmPackage.findConditionalPath(
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
      UtilsCjsEsmPackage.findConditionalPath(
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
      UtilsCjsEsmPackage.findConditionalPath(
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
