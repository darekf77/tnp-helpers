import * as ts from 'typescript';

export class TsImportExport {
  type: 'export' | 'import' | 'async-import' | 'require';
  embeddedNameToFile: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  parenthesisType: 'single' | 'double' | 'tics';

  constructor(
    type: 'export' | 'import' | 'async-import' | 'require',
    embeddedNameToFile: string,
    start: ts.LineAndCharacter,
    end: ts.LineAndCharacter,
    parenthesisType: 'single' | 'double' | 'tics',
  ) {
    this.type = type;
    this.embeddedNameToFile = embeddedNameToFile;
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
}

export const recognizeImportsFromFile =(fileContent: string): TsImportExport[] => {
  const sourceFile = ts.createSourceFile(
    'file.ts', // a name for the file
    fileContent,
    ts.ScriptTarget.Latest,
    true,
  );

  const results: TsImportExport[] = [];

  function visit(node: ts.Node) {
    // Check for dynamic import expressions specifically
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
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

    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const specifier = node.moduleSpecifier
        ? (node.moduleSpecifier as ts.Expression).getText(sourceFile)
        : '';
      const parenthesisType = getQuoteType(specifier);
      const type =
        node.kind === ts.SyntaxKind.ImportDeclaration ? 'import' : 'export';
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
      ts.isCallExpression(node) &&
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

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);

  return results;
}
