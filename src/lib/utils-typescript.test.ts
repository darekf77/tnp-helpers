import { UtilsTypescript } from './utils-typescript';

describe('UtilsTypescript.removeCommentsFromTsContent', () => {
  it('should remove line comments', () => {
    const input = `
const a = 1; // remove me
const b = 2;
`;

    const result = UtilsTypescript.removeCommentsFromTsContent(input);

    expect(result).toContain('const a = 1;');
    expect(result).toContain('const b = 2;');
    expect(result).not.toContain('remove me');
  });

  it('should remove block comments', () => {
    const input = `
/* remove me */
const a = 1;

/**
 * remove jsdoc
 */
const b = 2;
`;

    const result = UtilsTypescript.removeCommentsFromTsContent(input);

    expect(result).toContain('const a = 1;');
    expect(result).toContain('const b = 2;');
    expect(result).not.toContain('remove me');
    expect(result).not.toContain('remove jsdoc');
  });

  it('should not remove comment-like text inside strings', () => {
    const input = `
const url = "https://example.com";
const text = "/* not a comment */";
const line = "// not a comment";
`;

    const result = UtilsTypescript.removeCommentsFromTsContent(input);

    expect(result).toContain('"https://example.com"');
    expect(result).toContain('"/* not a comment */"');
    expect(result).toContain('"// not a comment"');
  });

  it('should not remove comment-like text inside template literals', () => {
    const input = `
const tpl = \`
  https://example.com
  /* not a comment */
  // not a comment
\`;
`;

    const result = UtilsTypescript.removeCommentsFromTsContent(input);

    expect(result).toContain('https://example.com');
    expect(result).toContain('/* not a comment */');
    expect(result).toContain('// not a comment');
  });

  it('should not break regex literals', () => {
    const input = `
const regex1 = /\\/\\/abc/;
const regex2 = /\\/\\*abc\\*\\//;
`;

    const result = UtilsTypescript.removeCommentsFromTsContent(input);

    expect(result).toContain('/\\/\\/abc/');
    expect(result).toContain('/\\/\\*abc\\*\\//');
  });

  it('should remove mixed comments reliably', () => {
    const input = `
// top comment
const a = 1; // inline comment
const url = "https://example.com"; /* block comment */
const str = "// keep this";
`;

    const result = UtilsTypescript.removeCommentsFromTsContent(input);

    expect(result).toContain('const a = 1;');
    expect(result).toContain('"https://example.com"');
    expect(result).toContain('"// keep this"');

    expect(result).not.toContain('top comment');
    expect(result).not.toContain('inline comment');
    expect(result).not.toContain('block comment');
  });

  describe('UtilsTypescript.removeCommentsFromTsContent', () => {
    const removeComments = (
      content: string,
      opt?: {
        removeRegions?: boolean;
        removeImportTags?: boolean;
      },
    ) => {
      return UtilsTypescript.removeCommentsFromTsContent(content, opt);
    };

    it('should remove regular comments', () => {
      const input = `
const a = 1; // regular comment

// another regular comment
const b = 2;
`;

      const result = removeComments(input);

      expect(result).toContain('const a = 1;');
      expect(result).toContain('const b = 2;');

      expect(result).not.toContain('regular comment');
      expect(result).not.toContain('another regular comment');
    });

    it('should preserve regions by default', () => {
      const input = `
//#region my region
const a = 1;
//#endregion
`;

      const result = removeComments(input);

      expect(result).toContain('//#region my region');
      expect(result).toContain('//#endregion');
      expect(result).toContain('const a = 1;');
    });

    it('should preserve regions with spaces by default', () => {
      const input = `
// #region my region
const a = 1;
// #endregion
`;

      const result = removeComments(input);

      expect(result).toContain('// #region my region');
      expect(result).toContain('// #endregion');
    });

    it('should remove regions when removeRegions=true', () => {
      const input = `
//#region my region
const a = 1;
//#endregion
`;

      const result = removeComments(input, {
        removeRegions: true,
      });

      expect(result).not.toContain('#region');
      expect(result).not.toContain('#endregion');
      expect(result).toContain('const a = 1;');
    });

    it('should preserve import tags by default', () => {
      const input = `
import {
  Anything,
  SomethingElse,
} from 'npm-package'; // @backend
`;

      const result = removeComments(input);

      expect(result).toContain(`from 'npm-package'`);

      // depending on TS printer quote configuration,
      // check the important semantic part separately
      expect(result).toContain('@backend');
    });

    it('should preserve export tags by default', () => {
      const input = `
export {
  Anything,
  SomethingElse,
} from 'npm-package'; // @browser
`;

      const result = removeComments(input);

      expect(result).toContain(`from 'npm-package'`);

      // depending on TS printer quote configuration,
      // check the important semantic part separately
      expect(result).toContain('@browser');
    });

    it('should preserve export general tag by default', () => {
      const input = `
export * from 'npm-package'; // @websql
`;

      const result = removeComments(input);

      expect(result).toContain(`from 'npm-package'`);

      // depending on TS printer quote configuration,
      // check the important semantic part separately
      expect(result).toContain('@websql');
    });

    it('should preserve different Taon tags by default', () => {
      const input = `
import { BackendThing } from 'backend-package'; // @backend
import { FrontendThing } from 'frontend-package'; // @frontend
import { WorkerThing } from 'worker-package'; // @worker
`;

      const result = removeComments(input);

      expect(result).toContain('@backend');
      expect(result).toContain('@frontend');
      expect(result).toContain('@worker');
    });

    it('should preserve standalone import tag by default', () => {
      const input = `
const a = 1;
; // @backend
const b = 2;
`;

      const result = removeComments(input);

      expect(result).toContain('@backend');
    });

    it('should remove import tags when removeImportTags=true', () => {
      const input = `
import { Anything } from 'npm-package'; // @backend
import { Other } from 'other-package'; // @frontend
`;

      const result = removeComments(input, {
        removeImportTags: true,
      });

      expect(result).not.toContain('@backend');
      expect(result).not.toContain('@frontend');

      expect(result).toContain('Anything');
      expect(result).toContain('Other');
    });

    it('should remove regions and import tags when both options are enabled', () => {
      const input = `
//#region imports
import { Anything } from 'npm-package'; // @backend
//#endregion

//#region code
const value = 123; // ordinary comment
//#endregion
`;

      const result = removeComments(input, {
        removeRegions: true,
        removeImportTags: true,
      });

      expect(result).not.toContain('#region');
      expect(result).not.toContain('#endregion');
      expect(result).not.toContain('@backend');
      expect(result).not.toContain('ordinary comment');

      expect(result).toContain('Anything');
      expect(result).toContain('const value = 123;');
    });

    it('should preserve regions and import tags while removing ordinary comments', () => {
      const input = `
//#region backend
import { Anything } from 'npm-package'; // @backend

// ordinary comment that should disappear
const value = 123; // another ordinary comment
//#endregion
`;

      const result = removeComments(input);

      expect(result).toContain('//#region backend');
      expect(result).toContain('//#endregion');
      expect(result).toContain('@backend');

      expect(result).not.toContain('ordinary comment that should disappear');
      expect(result).not.toContain('another ordinary comment');
    });

    it('should return empty content unchanged', () => {
      expect(removeComments('')).toBe('');
    });
  });
});
