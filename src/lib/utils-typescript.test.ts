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
});
