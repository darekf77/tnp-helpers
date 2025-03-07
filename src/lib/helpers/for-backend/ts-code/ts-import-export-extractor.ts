import {
  isExportDeclaration,
  isImportDeclaration,
  LineAndCharacter,
  createSourceFile,
  ScriptTarget,
  Node,
  Expression,
  SyntaxKind,
  isCallExpression,
  forEachChild,
} from 'typescript';

export class TsImportExport {
  type: 'export' | 'import' | 'async-import' | 'require';
  /**
   * ORIGNAL
   * Name of the file that is being imported/exported
   * with parenthesis included
   */
  embeddedPathToFile: string;
  /**
   * same as cleanEmbeddedPathToFile but without quotes (parenthesis)
   */
  cleanEmbeddedPathToFile: string;
  removeStartEndQuotes(str: string) {
    return str.replace(/^['"`]/, '').replace(/['"`]$/, '');
  }
  /**
   * RESULT OF PROCESSING
   */
  embeddedPathToFileResult: string;
  packageName: string;
  isIsomorphic?: boolean;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  parenthesisType: 'single' | 'double' | 'tics';
  wrapInParenthesis(str: string) {
    return this.parenthesisType === 'single'
      ? `'${str}'`
      : this.parenthesisType === 'double'
        ? `"${str}"`
        : `\`${str}\``;
  }

  constructor(
    type: 'export' | 'import' | 'async-import' | 'require',
    embeddedPathToFile: string,
    start: LineAndCharacter,
    end: LineAndCharacter,
    parenthesisType: 'single' | 'double' | 'tics',
  ) {
    this.type = type;
    this.isIsomorphic = false;
    this.embeddedPathToFile = embeddedPathToFile;
    this.cleanEmbeddedPathToFile =
      this.removeStartEndQuotes(embeddedPathToFile);
    this.embeddedPathToFileResult = embeddedPathToFile;
    this.startRow = start.line + 1; // TypeScript lines are zero-based
    this.startCol = start.character + 1;
    this.endRow = end.line + 1;
    this.endCol = end.character + 1;
    this.parenthesisType = parenthesisType;
  }
}

const getQuoteType = (text: string): 'single' | 'double' | 'tics' => {
  if (text.startsWith('`')) return 'tics';
  if (text.startsWith("'")) return 'single';
  return 'double';
};

export const recognizeImportsFromFile = (
  fileContent: string,
): TsImportExport[] => {
  //#region @backendFunc
  const sourceFile = createSourceFile(
    'file.ts', // a name for the file
    fileContent,
    ScriptTarget.Latest,
    true,
  );

  const results: TsImportExport[] = [];

  function visit(node: Node) {
    // Check for dynamic import expressions specifically
    if (
      isCallExpression(node) &&
      node.expression.kind === SyntaxKind.ImportKeyword
    ) {
      const args = node.arguments;
      if (args.length) {
        const arg = args[0];
        const specifier = arg.getText(sourceFile);
        const parenthesisType = getQuoteType(specifier);
        results.push(
          new TsImportExport(
            'async-import',
            specifier,
            sourceFile.getLineAndCharacterOfPosition(node.getStart()),
            sourceFile.getLineAndCharacterOfPosition(node.getEnd()),
            parenthesisType,
          ),
        );
      }
    }

    if (isImportDeclaration(node) || isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier
        ? (node.moduleSpecifier as Expression).getText(sourceFile)
        : '';
      const parenthesisType = getQuoteType(specifier);
      const type =
        node.kind === SyntaxKind.ImportDeclaration ? 'import' : 'export';
      results.push(
        new TsImportExport(
          type,
          specifier,
          sourceFile.getLineAndCharacterOfPosition(node.getStart()),
          sourceFile.getLineAndCharacterOfPosition(node.getEnd()),
          parenthesisType,
        ),
      );
    }

    if (
      isCallExpression(node) &&
      node.expression.getText(sourceFile) === 'require'
    ) {
      const args = node.arguments;
      if (args.length > 0) {
        const arg = args[0];
        const specifier = arg.getText(sourceFile);
        const parenthesisType = getQuoteType(specifier);
        results.push(
          new TsImportExport(
            'require',
            specifier,
            sourceFile.getLineAndCharacterOfPosition(arg.getStart()),
            sourceFile.getLineAndCharacterOfPosition(arg.getEnd()),
            parenthesisType,
          ),
        );
      }
    }

    forEachChild(node, visit);
  }

  forEachChild(sourceFile, visit);

  return results;
  //#endregion
};
