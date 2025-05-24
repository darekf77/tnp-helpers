//#region imports
import { crossPlatformPath, fse, path } from 'tnp-core/src';
import { _, CoreModels, Utils } from 'tnp-core/src';
import {
  createPrinter,
  createSourceFile,
  factory,
  getLeadingCommentRanges,
  isClassDeclaration,
  isSourceFile,
  NodeArray,
  ScriptKind,
  ScriptTarget,
  SourceFile,
  Statement,
  transform,
  TransformationContext,
  visitEachChild,
  Node,
  isFunctionDeclaration,
  isVariableStatement,
  isIdentifier,
  NodeFlags,
  isEnumDeclaration,
  isTypeAliasDeclaration,
  isInterfaceDeclaration,
  isModuleDeclaration,
  isExportAssignment,
  forEachChild,
  Declaration,
  getCombinedModifierFlags,
  ModifierFlags,
  SyntaxKind,
  isVariableDeclaration,
  isCallExpression,
  isPropertyAccessExpression,
  isObjectLiteralExpression,
  isPropertyAssignment,
  isStringLiteral,
  canHaveDecorators,
  getDecorators,
  visitNode,
  isExportDeclaration,
  isImportDeclaration,
  Expression,
  isNamedImports,
  isNamedExports,
  NewLineKind,
  TransformerFactory,
  isDecorator,
  isEmptyStatement,
  isExpressionStatement,
  isPropertyDeclaration,
  isMethodDeclaration,
} from 'typescript';
import type * as ts from 'typescript';

import { Helpers } from './index';
//#endregion

//#region utils npm
export namespace UtilsNpm {
  //#region is special version
  export const isSpecialVersion = (version: string) => {
    return CoreModels.NpmSpecialVersions.includes(version);
  };
  //#endregion

  //#region clear version
  export const clearVersion = (
    version: string,
    options: {
      removePrefixes?: boolean;
      /**
       * Remove alpha, beta, rc, latest, next etc.
       */
      removeSuffix?: boolean;
    },
  ) => {
    const { removePrefixes, removeSuffix } = options || {};

    if (!version || isSpecialVersion(version)) {
      return version;
    }

    version = (version || '')
      .trim()
      .replace(new RegExp(Utils.escapeStringForRegEx('undefined'), 'g'), '0');

    if (removePrefixes) {
      version = version.replace('^', '').replace('~', '');
    }
    let [major, minor, patch, alphaOrBetaOrRc] = version.split('.');
    if (removeSuffix) {
      alphaOrBetaOrRc = '';
    }
    return fixMajorVerNumber(
      `${major}.${minor}.${patch}${alphaOrBetaOrRc ? '.' + alphaOrBetaOrRc : ''}`,
    );
  };
  //#endregion

  //#region fix major version number
  export const fixMajorVerNumber = (version: string) => {
    if (!version || isSpecialVersion(version)) {
      return version;
    }
    version = (version || '')
      .trim()
      .replace(new RegExp(Utils.escapeStringForRegEx('undefined'), 'g'), '0');
    const splited = version.split('.');
    let [major, minor, patch, alphaOrBetaOrRc] = splited;
    if (splited.length === 1) {
      minor = '0';
      patch = '0';
    } else if (splited.length === 2) {
      patch = '0';
    }
    return `${major}.${minor}.${patch}${alphaOrBetaOrRc ? '.' + alphaOrBetaOrRc : ''}`;
  };
  //#endregion
}
//#endregion

//#region utils typescript
export namespace UtilsTypescript {
  //#region remove region by name
  /**
   * Remove TypeScript region blocks by their name, including nested regions.
   *
   * @param sourceCode - The TypeScript source code as a string.
   * @param regionName - The name of the region to remove.
   * @returns Modified TypeScript code without the specified regions.
   */
  export const removeRegionByName = (
    sourceCode: string,
    regionName: string,
  ): string => {
    //#region @backendFunc
    // Create a source file using TypeScript's compiler API
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    // Prepare a printer to convert the modified AST back to code
    const printer = createPrinter();

    // Traverse the AST and remove specified //#region blocks
    const transformer = <T extends Node>(context: TransformationContext) => {
      const visit = (node: T): T | undefined => {
        // @ts-ignore
        if (isSourceFile(node)) {
          const statements = removeRegions(node.statements, regionName);
          // @ts-ignore
          return factory.updateSourceFile(node, statements) as T;
        }
        // @ts-ignore
        return visitEachChild(node, visit, context);
      };

      return visit;
    };

    // Apply the transformation
    // @ts-ignore
    const result = transform(sourceFile, [transformer]);

    // Get the modified source file
    const transformedSourceFile = result.transformed[0] as SourceFile;

    // Print the transformed source file back to a string
    const modifiedCode = printer.printFile(transformedSourceFile);

    result.dispose();

    return modifiedCode;
    //#endregion
  };

  /**
   * Removes the specified region blocks and handles nested regions.
   *
   * @param statements - List of statements in the source file.
   * @param regionName - The name of the region to remove.
   * @returns Modified list of statements without the specified regions.
   */
  const removeRegions = (
    statements: NodeArray<Statement>,
    regionName: string,
  ): Statement[] => {
    //#region @backendFunc
    const result: Statement[] = [];
    const stack: { insideTargetRegion: boolean; level: number }[] = [];
    let currentLevel = 0;

    for (const statement of statements) {
      const commentRanges =
        getLeadingCommentRanges(statement.getFullText(), 0) || [];
      const commentText = statement.getFullText();

      for (const range of commentRanges) {
        const comment = commentText.slice(range.pos, range.end).trim();

        // Detect start of a region
        const regionMatch = comment.match(/^\/\/#region (.*)/);
        if (regionMatch) {
          currentLevel++;
          const name = regionMatch[1].trim();

          // Push the current state of the stack
          stack.push({
            insideTargetRegion:
              stack.length > 0
                ? stack[stack.length - 1].insideTargetRegion
                : false,
            level: currentLevel,
          });

          // Check if this region matches the target
          if (name === regionName) {
            stack[stack.length - 1].insideTargetRegion = true;
          }

          continue;
        }

        // Detect end of a region
        if (comment.startsWith('//#endregion')) {
          if (
            stack.length > 0 &&
            stack[stack.length - 1].level === currentLevel
          ) {
            stack.pop();
          }
          currentLevel--;
          continue;
        }
      }

      // Check the top of the stack to see if we're inside the target region
      const insideTargetRegion =
        stack.length > 0 ? stack[stack.length - 1].insideTargetRegion : false;

      // Add statements that are not inside the target region
      if (!insideTargetRegion) {
        result.push(statement);
      }
    }

    return result;
    //#endregion
  };
  //#endregion

  //#region extract exports from a TypeScript file

  //#region helper function to check if a node is exported
  const isExported = (node: Node): boolean => {
    //#region @backendFunc
    return (
      (getCombinedModifierFlags(node as Declaration) & ModifierFlags.Export) !==
        0 || node.parent?.kind === SyntaxKind.SourceFile // For top-level exports
    );
    //#endregion
  };
  //#endregion

  //#region exports from file

  interface ExportInfo {
    type:
      | 'class'
      | 'function'
      | 'const'
      | 'let'
      | 'var'
      | 'enum'
      | 'type'
      | 'interface'
      | 'default'
      | 'module'
      | 'namespace';
    name: string;
  }

  /**
   * Function to extract exports from a TypeScript file
   */
  export const exportsFromFile = (filePath: string): ExportInfo[] => {
    //#region @backendFunc
    if (!filePath.endsWith('.ts')) {
      return [];
    }
    const file = Helpers.readFile(filePath);
    return exportsFromContent(file);
    //#endregion
  };

  /**
   * Function to extract exports from a TypeScript file
   */
  export const exportsFromContent = (fileContent: string): ExportInfo[] => {
    //#region @backendFunc
    // Read the content of the file
    const sourceCode = fileContent;

    // Create a SourceFile object using the TypeScript API
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
    );

    // Array to hold the exports found
    const exports: {
      type:
        | 'class'
        | 'function'
        | 'const'
        | 'let'
        | 'var'
        | 'enum'
        | 'type'
        | 'interface'
        | 'default'
        | 'module'
        | 'namespace';
      name: string;
    }[] = [];

    //#region function to recursively check each node in the AST
    const checkNode = (node: Node) => {
      //#region @backendFunc
      // Determine the type and name of export based on node type
      if (isClassDeclaration(node) && node.name && isExported(node)) {
        exports.push({ type: 'class', name: node.name.text });
      } else if (isFunctionDeclaration(node) && node.name && isExported(node)) {
        exports.push({ type: 'function', name: node.name.text });
      } else if (isVariableStatement(node) && isExported(node)) {
        node.declarationList.declarations.forEach(declaration => {
          if (isIdentifier(declaration.name)) {
            exports.push({
              type:
                node.declarationList.flags & NodeFlags.Const
                  ? 'const'
                  : node.declarationList.flags & NodeFlags.Let
                    ? 'let'
                    : 'var',
              name: declaration.name.text,
            });
          }
        });
      } else if (isEnumDeclaration(node) && isExported(node)) {
        exports.push({ type: 'enum', name: node.name.text });
      } else if (isTypeAliasDeclaration(node) && isExported(node)) {
        exports.push({ type: 'type', name: node.name.text });
      } else if (isInterfaceDeclaration(node) && isExported(node)) {
        exports.push({ type: 'interface', name: node.name.text });
      } else if (isModuleDeclaration(node) && isExported(node)) {
        exports.push({ type: 'module', name: node.name.text });
      } else if (isExportAssignment(node)) {
        exports.push({ type: 'default', name: 'default' }); // `export default ...`
      }

      // Recursively check each child node
      forEachChild(node, checkNode);
      //#endregion
    };
    //#endregion

    // Start checking from the root node
    checkNode(sourceFile);

    return exports;
    //#endregion
  };
  //#endregion

  //#endregion

  //#region extract class names from ts file or source code

  export const extractDefaultClassNameFromString = (
    sourceCode: string,
  ): string | undefined => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    let defaultClassName = '';
    const checkNode = (node: Node) => {
      if (
        isClassDeclaration(node) &&
        node.modifiers?.find(m => m.kind === SyntaxKind.DefaultKeyword)
      ) {
        defaultClassName = node.name?.text || '';
      }
      forEachChild(node, checkNode);
    };
    checkNode(sourceFile);
    return defaultClassName;
    //#endregion
  };

  export const extractClassNameFromString = (sourceCode: string): string[] => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceCode,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const classNames: string[] = [];
    const checkNode = (node: Node) => {
      if (isClassDeclaration(node)) {
        classNames.push(node.name?.text || '');
      }
      forEachChild(node, checkNode);
    };
    checkNode(sourceFile);
    return classNames;
    //#endregion
  };

  export const extractClassNamesFromFile = (
    absoluteFilePath: string,
  ): string[] => {
    //#region @backendFunc
    if (!absoluteFilePath.endsWith('.ts')) {
      return [];
    }
    const sourceCode = Helpers.readFile(absoluteFilePath);
    return extractClassNameFromString(sourceCode);
    //#endregion
  };

  export const extractDefaultClassNameFromFile = (absoluteFilePath: string) => {
    //#region @backendFunc
    const sourceCode = Helpers.readFile(absoluteFilePath);
    return extractDefaultClassNameFromString(sourceCode);
    //#endregion
  };
  //#endregion

  //#region format file(s) with prettier
  export const formatFile = (absPathToFile: string | string[]): void => {
    //#region @backendFunc
    absPathToFile = crossPlatformPath(absPathToFile);
    if (Helpers.exists(absPathToFile)) {
      const { execSync } = require('child_process');
      Helpers.logInfo(`Formatting file: ${absPathToFile}`);
      try {
        execSync(`prettier --write ${path.basename(absPathToFile)}`, {
          cwd: path.dirname(absPathToFile),
        });
      } catch (error) {
        console.warn(`Not able to format file: ${absPathToFile}`);
      }
      Helpers.taskDone(`Formatting file done.`);
    }
    //#endregion
  };

  export const formatAllFilesInsideFolder = (absPathToFolder: string): void => {
    //#region @backendFunc
    if (Helpers.exists(absPathToFolder)) {
      if (!Helpers.isFolder(absPathToFolder)) {
        Helpers.error(`"${absPathToFolder}" is not a folder`);
      }
      const { execSync } = require('child_process');
      try {
        execSync(`prettier --write .`, { cwd: absPathToFolder });
      } catch (error) {
        console.warn(`Not able to prettier all files in: ${absPathToFolder}`);
      }
    }
    //#endregion
  };
  //#endregion

  //#region lint file(s) with eslint
  export const eslintFixFile = (absPathToFile: string | string[]): void => {
    //#region @backendFunc
    absPathToFile = crossPlatformPath(absPathToFile);
    if (Helpers.exists(absPathToFile)) {
      const { execSync } = require('child_process');
      Helpers.logInfo(`Fixing file with eslint: ${absPathToFile}`);
      try {
        execSync(
          `npx --yes eslint --fix ${path.basename(absPathToFile as string)}`,
          {
            cwd: path.dirname(absPathToFile as string),
          },
        );
      } catch (error) {}
      Helpers.taskDone(`Eslint file fix done.`);
    }
    //#endregion
  };

  export const eslintFixAllFilesInsideFolder = (
    absPathToFolder: string | string[],
  ): void => {
    //#region @backendFunc
    absPathToFolder = crossPlatformPath(absPathToFolder);
    if (Helpers.exists(absPathToFolder)) {
      Helpers.info(`Fixing files with eslint in: ${absPathToFolder}`);
      const lintFixFn = () => {
        try {
          Helpers.run(`npx --yes eslint --fix . `, {
            cwd: absPathToFolder,
            output: false,
            silence: true,
          }).sync();
        } catch (error) {}
      };
      lintFixFn();
      lintFixFn(); // sometimes it needs to be run twice
      Helpers.info(`Eslint fixing files done.`);
    }
    //#endregion
  };
  //#endregion

  //#region extract Taon contexts from file
  export const getTaonContextFromContent = (fileContent: string): string[] => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'tempFile.ts',
      fileContent,
      ScriptTarget.Latest,
      true,
    );

    const contextNames: string[] = [];

    // Recursive function to walk through the AST
    const visitNode = (node: any) => {
      try {
        if (
          isVariableDeclaration(node) &&
          node.initializer &&
          isCallExpression(node.initializer)
        ) {
          let functionName = '';
          let objectName = '';

          if (isPropertyAccessExpression(node.initializer.expression)) {
            functionName = node.initializer.expression.name?.text || '';
            objectName =
              node.initializer.expression.expression?.getText() || '';
          } else if (isIdentifier(node.initializer.expression)) {
            functionName = node.initializer.expression.text;
          }

          if (
            functionName === 'createContext' &&
            (objectName === 'Taon' || objectName === '')
          ) {
            if (node.name && isIdentifier(node.name)) {
              contextNames.push(node.name.text);
            }
          }
        }

        forEachChild(node, visitNode);
      } catch (error) {
        console.error('Error processing node:', error);
      }
    };

    try {
      forEachChild(sourceFile, visitNode);
    } catch (error) {
      console.error('Error traversing AST:', error);
    }

    return contextNames;
    //#endregion
  };

  export const getTaonContextsNamesFromFile = (
    tsAbsFilePath: string,
  ): string[] => {
    //#region @backendFunc
    return getTaonContextFromContent(Helpers.readFile(tsAbsFilePath));
    //#endregion
  };

  //#endregion

  //#region extract selectors from Angular components class files
  export const extractAngularComponentSelectors = (
    fileAbsPath: string,
  ): { className: string; selector: string }[] => {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      fileAbsPath,
      Helpers.readFile(fileAbsPath),
      ScriptTarget.Latest,
      true,
    );

    const selectors: { className: string; selector: string }[] = [];

    const visit = (node: any) => {
      if (isClassDeclaration(node) && node.name) {
        const decorators = canHaveDecorators(node)
          ? getDecorators(node)
          : undefined;
        if (decorators) {
          for (const decorator of decorators) {
            if (
              isCallExpression(decorator.expression) &&
              isIdentifier(decorator.expression.expression) &&
              decorator.expression.expression.text === 'Component'
            ) {
              const args = decorator.expression.arguments;
              if (args.length > 0 && isObjectLiteralExpression(args[0])) {
                for (const property of args[0].properties) {
                  if (
                    isPropertyAssignment(property) &&
                    isIdentifier(property.name) &&
                    property.name.text === 'selector' &&
                    isStringLiteral(property.initializer)
                  ) {
                    selectors.push({
                      className: node.name.text,
                      selector: property.initializer.text,
                    });
                  }
                }
              }
            }
          }
        }
      }
      forEachChild(node, visit);
    };

    visit(sourceFile);
    return selectors;
    //#endregion
  };
  //#endregion

  //#region wrap one line with comment
  export const wrapWithComment = (
    oneLineComment: string,
    absDestFilePath: string,
  ) => {
    //#region @backendFunc
    const ext = path.extname(absDestFilePath).toLowerCase();
    let commentSyntax;

    switch (ext) {
      case '.ts':
      case '.js':
      case '.jsonc':
      case '.sh':
        commentSyntax = `// ${oneLineComment}`;
        break;
      case '.html':
        commentSyntax = `<!-- ${oneLineComment} -->`;
        break;
      case '.css':
      case '.scss':
      case '.sass':
        commentSyntax = `/* ${oneLineComment} */`;
        break;
      default:
        console.warn(`Unknown file extension: ${ext}`);
        commentSyntax = oneLineComment;
    }
    return commentSyntax;
    //#endregion
  };
  //#endregion

  //#region ser or add exported variable with AST
  // Helper to check if a node has 'export' in its modifiers
  // const hasExportModifier = (
  //   modifiers: ts.NodeArray<ts.Modifier> | undefined,
  // ) => {
  //   return (
  //     !!modifiers && modifiers.some(m => m.kind === SyntaxKind.ExportKeyword)
  //   );
  // };

  /**
   * Attempts to set or add an exported const with given name and value.
   */
  export const setValueToVariableInTsFile = (
    tsAbsFilePath: string,
    variableName: string,
    valueOfVariable: any,
    addIfNotExists = true,
  ): void => {
    //#region @backendFunc
    const sourceText = Helpers.readFile(tsAbsFilePath);
    const sourceFile = createSourceFile(
      tsAbsFilePath,
      sourceText,
      ScriptTarget.Latest,
      /*setParentNodes */ true,
    );

    // We'll build an AST transformer that modifies or inserts our variable declaration
    const transformer = (context: TransformationContext) => {
      const { factory } = context;

      return (rootNode: SourceFile) => {
        let variableFound = false;

        const visit = (node: ts.Node): ts.Node => {
          // Check for "export const <variableName> = ...;"
          if (
            isVariableStatement(node)
            // && hasExportModifier(node.modifiers as any)
          ) {
            const declList = node.declarationList;
            const newDeclarations = declList.declarations.map(decl => {
              if (isIdentifier(decl.name) && decl.name.text === variableName) {
                variableFound = true;

                // Create a new initializer. If valueOfVariable is a string,
                // we wrap it with quotes; otherwise, create a numeric or object literal.
                let initializer: ts.Expression;
                if (typeof valueOfVariable === 'string') {
                  initializer = factory.createStringLiteral(valueOfVariable);
                } else if (typeof valueOfVariable === 'number') {
                  initializer = factory.createNumericLiteral(valueOfVariable);
                } else {
                  // Fallback: wrap JSON string => parse with TS
                  // Or you can create a more sophisticated approach for arrays/objects
                  initializer = factory.createIdentifier(
                    JSON.stringify(valueOfVariable),
                  );
                }

                // Return a new variable declaration with the updated initializer
                return factory.updateVariableDeclaration(
                  decl,
                  decl.name,
                  decl.exclamationToken,
                  decl.type,
                  initializer,
                );
              }
              return decl;
            });

            // Return a new VariableStatement if we changed anything
            return factory.updateVariableStatement(
              node,
              node.modifiers,
              factory.updateVariableDeclarationList(declList, newDeclarations),
            );
          }

          return visitEachChild(node, visit, context);
        };

        let updatedRoot = visitNode(rootNode, visit) as any;

        // If variable not found and addIfNotExists === true, add a new export statement
        if (!variableFound && addIfNotExists) {
          // Create something like: export const <variableName> = <valueOfVariable>;
          let initializer: ts.Expression;
          if (typeof valueOfVariable === 'string') {
            initializer = factory.createStringLiteral(valueOfVariable);
          } else if (typeof valueOfVariable === 'number') {
            initializer = factory.createNumericLiteral(valueOfVariable);
          } else {
            initializer = factory.createIdentifier(
              JSON.stringify(valueOfVariable),
            );
          }

          const newVarStatement = factory.createVariableStatement(
            [factory.createModifier(SyntaxKind.ExportKeyword)],
            factory.createVariableDeclarationList(
              [
                factory.createVariableDeclaration(
                  factory.createIdentifier(variableName),
                  /* exclamationToken */ undefined,
                  /* type */ undefined,
                  initializer,
                ),
              ],
              NodeFlags.Const,
            ),
          );

          // Append it to the end of the file
          const newStatements = [...updatedRoot.statements, newVarStatement];
          updatedRoot = factory.updateSourceFile(updatedRoot, newStatements);
        }

        return updatedRoot;
      };
    };

    // Apply the transformer
    const result = transform(sourceFile, [transformer]);
    const transformedSourceFile = result.transformed[0] as ts.SourceFile;

    // Print the new AST back to text
    const printer = createPrinter();
    const newContent = printer.printFile(transformedSourceFile);

    // Overwrite the file
    Helpers.writeFile(tsAbsFilePath, newContent);
    result.dispose();
    //#endregion
  };

  //#endregion

  //#region recognize imports from file

  //#region helpers / ts import export class
  export class TsImportExport {
    /**
     * for external modification
     */
    embeddedPathToFileResult: string;
    /**
     * for external modification
     */
    packageName: string;
    /**
     * for external modification
     */
    isIsomorphic?: boolean;

    //#region generated/readonly files
    readonly type: 'export' | 'import' | 'async-import' | 'require';
    /**
     * ORIGNAL
     * Name of the file that is being imported/exported
     * with parenthesis included , example
     * 'my-file' or "my-file" or `my-file`
     */
    readonly embeddedPathToFile: string;
    /**
     * same as cleanEmbeddedPathToFile but without quotes (parenthesis), example:
     * my-file or my-file or my-file
     */
    readonly cleanEmbeddedPathToFile: string;
    readonly startRow: number;
    readonly startCol: number;
    readonly endRow: number;
    readonly endCol: number;
    readonly parenthesisType: 'single' | 'double' | 'tics';
    readonly importElements: string[] = [];
    //#endregion

    //#region constructor
    constructor(
      type: 'export' | 'import' | 'async-import' | 'require',
      embeddedPathToFile: string,
      start: ts.LineAndCharacter,
      end: ts.LineAndCharacter,
      parenthesisType: 'single' | 'double' | 'tics',
      importElements: string[] = [],
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
      this.importElements = importElements;
    }
    //#endregion

    //#region remove quotes
    private removeStartEndQuotes(str: string): string {
      return str.replace(/^['"`]/, '').replace(/['"`]$/, '');
    }
    //#endregion

    //#region get string part
    /**
     * it will extract part of the file content
     * that is between startRow, startCol and endRow, endCol
     * and contains import/export/require statement
     */
    public getStringPartFrom(wholeContentOfFile: string): string {
      const lines = wholeContentOfFile.split('\n');

      // Convert 1-based row indices to 0-based
      const startRowIndex = this.startRow - 1;
      const endRowIndex = this.endRow - 1;

      // Ensure indices are within bounds
      if (startRowIndex >= lines.length || endRowIndex >= lines.length) {
        throw new Error('Row index out of bounds.');
      }

      let extractedLines: string[] = [];

      for (let i = startRowIndex; i <= endRowIndex; i++) {
        let line = lines[i];

        if (i === startRowIndex && i === endRowIndex) {
          // Same row: extract from startCol to endCol
          extractedLines.push(line.substring(this.startCol - 1, this.endCol));
        } else if (i === startRowIndex) {
          // First row: extract from startCol to end
          extractedLines.push(line.substring(this.startCol - 1));
        } else if (i === endRowIndex) {
          // Last row: extract from beginning to endCol
          extractedLines.push(line.substring(0, this.endCol));
        } else {
          // Whole row in between
          extractedLines.push(line);
        }
      }

      return extractedLines.join('\n');
    }
    //#endregion

    //#region wrap in current parenthesis
    public wrapInParenthesis(str: string): string {
      return this.parenthesisType === 'single'
        ? `'${str}'`
        : this.parenthesisType === 'double'
          ? `"${str}"`
          : `\`${str}\``;
      //#endregion
    }
  }
  //#endregion

  //#region helpers / get quote type
  const getQuoteType = (text: string): 'single' | 'double' | 'tics' => {
    if (text.startsWith('`')) return 'tics';
    if (text.startsWith("'")) return 'single';
    return 'double';
  };
  //#endregion

  const extractImportExportElements = (node: ts.Node): string[] => {
    const elements: string[] = [];

    if (isImportDeclaration(node) && node.importClause) {
      // Check if there are named imports inside { }
      if (
        node.importClause.namedBindings &&
        isNamedImports(node.importClause.namedBindings)
      ) {
        elements.push(
          ...node.importClause.namedBindings.elements.map(el => el.name.text),
        );
      }
    } else if (isExportDeclaration(node) && node.exportClause) {
      // Check if there are named exports inside { }
      if (isNamedExports(node.exportClause)) {
        elements.push(...node.exportClause.elements.map(el => el.name.text));
      }
    }

    return elements;
  };

  export const recognizeImportsFromFile = (
    fileAbsPAth: string,
  ): TsImportExport[] => {
    //#region @backendFunc
    const content = Helpers.readFile(fileAbsPAth);
    return recognizeImportsFromContent(content);
    //#endregion
  };

  export const recognizeImportsFromContent = (
    fileContent: string,
  ): TsImportExport[] => {
    //#region @backendFunc
    if (!fileContent) {
      return [];
    }

    const sourceFile = createSourceFile(
      'file.ts', // a name for the file
      fileContent,
      ScriptTarget.Latest,
      true,
    );

    const results: TsImportExport[] = [];

    const visit = (node: Node) => {
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
        const importExportElements = extractImportExportElements(node);
        results.push(
          new TsImportExport(
            type,
            specifier,
            sourceFile.getLineAndCharacterOfPosition(node.getStart()),
            sourceFile.getLineAndCharacterOfPosition(node.getEnd()),
            parenthesisType,
            importExportElements,
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
    };

    forEachChild(sourceFile, visit);

    return results;
    //#endregion
  };
  //#endregion

  //#region fix standalone ng 19
  /**
   * Transition methods ng18 => ng19
   * Remove standalone:true from component decorator
   * and add standalone: false if not exists
   */
  export function transformComponentStandaloneOption(
    sourceText: string,
  ): string {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      sourceText,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const printer = createPrinter({ newLine: NewLineKind.LineFeed });

    // @ts-ignore
    const transformerFactory: TransformerFactory<ts.SourceFile> = context => {
      const { factory } = context;

      const visit: ts.Visitor = node => {
        if (
          isDecorator(node) &&
          isCallExpression(node.expression) &&
          isIdentifier(node.expression.expression) &&
          node.expression.expression.text === 'Component'
        ) {
          const args = node.expression.arguments;
          if (args.length === 1 && isObjectLiteralExpression(args[0])) {
            const originalProps = args[0].properties;
            const newProps: ts.ObjectLiteralElementLike[] = [];

            let hasStandalone = false;
            let standaloneIsTrue = false;

            for (const prop of originalProps) {
              if (
                isPropertyAssignment(prop) &&
                isIdentifier(prop.name) &&
                prop.name.text === 'standalone'
              ) {
                hasStandalone = true;
                if (prop.initializer.kind === SyntaxKind.TrueKeyword) {
                  standaloneIsTrue = true;
                  continue; // skip it
                }
              }
              newProps.push(prop);
            }

            if (!hasStandalone) {
              // add standalone: false
              newProps.push(
                factory.createPropertyAssignment(
                  factory.createIdentifier('standalone'),
                  factory.createFalse(),
                ),
              );
            }

            const newArgs = [
              factory.updateObjectLiteralExpression(args[0], newProps),
            ];

            const newExpression = factory.updateCallExpression(
              node.expression,
              node.expression.expression,
              undefined,
              newArgs,
            );

            return factory.updateDecorator(node, newExpression);
          }
        }

        return visitEachChild(node, visit, context);
      };

      return node => visitNode(node, visit);
    };

    const result = transform(sourceFile, [transformerFactory]);
    const transformedSourceFile = result.transformed[0];
    const resultText = printer.printFile(transformedSourceFile);

    result.dispose();
    return resultText;
    //#endregion
  }
  //#endregion

  //#region escape @ in html text
  const escapeAtInHtmlText = (fileContent: string): string => {
    return fileContent.replace(
      />([^<@]*?)@([^<]*)</g,
      (_match, before, after) => {
        return `>${before}&#64;${after}<`;
      },
    );
  };

  export const fixHtmlTemplatesInDir = (directoryPath: string): void => {
    //#region @backendFunc
    Helpers.taskStarted(`(before prettier) Fixing HTML templates in`);
    const files = Helpers.filesFrom(directoryPath, true, false);

    for (const fullPath of files) {
      const file = path.basename(fullPath);
      if (Helpers.exists(fullPath)) {
        const stat = fse.statSync(fullPath);

        if (file.endsWith('.html')) {
          const original = Helpers.readFile(fullPath);
          const fixed = escapeAtInHtmlText(original);
          if (fixed !== original) {
            Helpers.writeFile(fullPath, fixed);
            console.log(`Html fixed @ -> &#64: ${fullPath}`);
          }
        }
      }
    }
    Helpers.taskDone(`(before prettier) Fixing HTML templates done.`);
    //#endregion
  };
  //#endregion

  //#region remove tagged imports/exports
  export function removeTaggedImportExport(
    tsFileContent: string,
    tags: string[],
    // debug = false,
  ): string {
    const sourceFile = createSourceFile(
      'temp.ts',
      tsFileContent,
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    // debug && console.log(tsFileContent);

    const lines = tsFileContent.split(/\r?\n/);
    const tagRegex = new RegExp(
      tags
        .map(t => (Array.isArray(t) ? t[0] : t))
        .filter(Boolean)
        .map(Utils.escapeStringForRegEx)
        .join('|'),
      'i',
    );

    let a = 0;
    for (const statement of sourceFile.statements) {
      // debug && console.log('processing line ' + a++);
      if (!isImportDeclaration(statement) && !isExportDeclaration(statement)) {
        continue;
      }

      const start = statement.getStart();
      const end = statement.getEnd();

      const startLine = sourceFile.getLineAndCharacterOfPosition(start).line;
      const endLine = sourceFile.getLineAndCharacterOfPosition(end).line;

      // get full text including trailing comments
      const endLineText = lines[endLine]; // ← get real line content from file

      if (!tagRegex.test(endLineText)) continue;

      // debug &&
      //   console.log(`
      //   start: ${start}
      //   end: ${end}
      //   startLine: ${startLine}
      //   endLine: ${endLine}
      //   endLineText: >> ${endLineText} <<
      //   `);

      // console.log('removing line ' + startLine + ' to ' + endLine);
      for (let i = startLine; i <= endLine; i++) {
        const original = lines[i];
        lines[i] = '/* */' + ' '.repeat(Math.max(0, original.length - 4));
      }
    }

    // debug && console.log('\n\n\n\n');
    const result = lines.join('\n');
    // debug && console.log(result)
    return result;
  }
  //#endregion

  //#region wrap first imports in region
  export const wrapFirstImportsInImportsRegion = (
    fileContent: string,
  ): string => {
    //#region @backendFunc
    const importRegionStart = `//#re` + `gion imports`;
    const importRegionEnd = `//#end` + `region`;

    const sourceFile = createSourceFile(
      'temp.ts',
      fileContent,
      ScriptTarget.Latest,
      true,
    );
    const lines = fileContent.split(/\r?\n/);

    const importDeclarations: ts.ImportDeclaration[] = [];

    for (const statement of sourceFile.statements) {
      if (isImportDeclaration(statement)) {
        importDeclarations.push(statement);
      } else if (
        isEmptyStatement(statement) ||
        (isExpressionStatement(statement) &&
          statement.getFullText(sourceFile).trim() === '')
      ) {
        // skip empty lines or empty statements
        continue;
      } else {
        break; // stop at first non-import statement
      }
    }

    if (importDeclarations.length === 0) {
      return fileContent; // nothing to wrap
    }

    const firstImportStart = importDeclarations[0].getFullStart();
    const lastImportEnd =
      importDeclarations[importDeclarations.length - 1].getEnd();

    // Get the line numbers (1-based)
    const startLine =
      sourceFile.getLineAndCharacterOfPosition(firstImportStart).line;
    const endLine =
      sourceFile.getLineAndCharacterOfPosition(lastImportEnd).line;

    const before = lines.slice(0, startLine);
    const importBlock = lines.slice(startLine, endLine + 1);
    const after = lines.slice(endLine + 1);

    return [
      ...before,
      importRegionStart,
      ...importBlock,
      importRegionEnd,
      ...after,
    ].join('\n');
    //#endregion
  };
  //#endregion

  //#region wrap entities class fields with region
  const applyEdits = (
    original: string,
    edits: { pos: number; text: string }[],
  ): string => {
    edits.sort((a, b) => b.pos - a.pos); // apply from end to start
    let result = original;
    for (const edit of edits) {
      result = result.slice(0, edit.pos) + edit.text + result.slice(edit.pos);
    }
    return result;
  };

  /**
   * wrap class field with decorators
   * wrap class methods with decorators
   */
  export function wrapContentClassMembersDecoratorsWithRegion(
    classFileContent: string,
    wrapTag = '@websql',
  ): string {
    //#region @backendFunc
    const sourceFile = createSourceFile(
      'temp.ts',
      classFileContent,
      ScriptTarget.Latest,
      true,
    );

    const edits: { pos: number; text: string }[] = [];

    const isAlreadyWrapped = (decorator: ts.Decorator): boolean => {
      const text = decorator.getFullText(sourceFile);
      return (
        text.includes(`//#reg` + `ion ${wrapTag}`) ||
        text.includes(`//#end` + `reg` + `ion`)
      );
    };

    const visit = (node: ts.Node) => {
      if (isClassDeclaration(node)) {
        for (const member of node.members) {
          if (!isPropertyDeclaration(member) && !isMethodDeclaration(member))
            continue;

          const decorators = canHaveDecorators(member)
            ? getDecorators(member)
            : undefined;

          if (!decorators || decorators.length === 0) continue;

          for (const decorator of decorators) {
            if (isAlreadyWrapped(decorator)) continue;

            const start = decorator.getStart();
            const end = decorator.getEnd();

            edits.push({ pos: start, text: `\n//#reg` + `ion ${wrapTag}\n` });
            edits.push({ pos: end, text: `\n//#end` + `reg` + `ion` }); // No extra newline
          }
        }
      }

      forEachChild(node, visit);
    };

    visit(sourceFile);
    return applyEdits(classFileContent, edits);
    //#endregion
  }
  //#endregion

  export type DeepWritable<T> = {
    -readonly [P in keyof T]: T[P] extends object
      ? T[P] extends Function
        ? T[P]
        : DeepWritable<T[P]>
      : T[P];
  };
}

//#endregion

//#region utils http
export namespace UtilsHttp {
  //#region utils http / start http server
  export const startHttpServer = async (cwd: string, port: number) => {
    //#region @backendFunc
    const express = require('express');
    const app = express();

    // Serve static files from the provided cwd
    app.use(express.static(cwd));

    // Catch-all to handle any invalid routes (404 errors)
    app.use((req, res) => {
      res.status(404).send('File not found');
    });

    // Start the server
    const server = app.listen(port, () => {
      console.log(
        `Server started at http://localhost:${port}, serving files from ${cwd}`,
      );
    });

    return new Promise<void>((resolve, reject) => {
      console.log(`Server started at http://localhost:${port}`);

      // Handle Ctrl+C (SIGINT) gracefully
      process.on('SIGINT', () => {
        server.close(() => resolve());
      });
    });
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils md
export namespace UtilsMd {
  /**
   * extract assets pathes from .md file
   */
  export const getAssets = (mdfileContent: string): string[] => {
    //#region @backendFunc
    // Regular expressions for detecting assets
    const markdownImgRegex = /!\[.*?\]\((.*?)\)/g; // Markdown image syntax ![alt](src)
    const htmlImgRegex = /<img.*?src=["'](.*?)["']/g; // HTML image syntax <img src="path">

    const assets: string[] = [];

    let match: RegExpExecArray | null;

    // Extract Markdown image links
    while ((match = markdownImgRegex.exec(mdfileContent)) !== null) {
      assets.push(match[1]); // Get the image path
    }

    // Extract HTML image links
    while ((match = htmlImgRegex.exec(mdfileContent)) !== null) {
      assets.push(match[1]); // Get the image path
    }

    return assets.map(r => r.replace(new RegExp(/^\.\//), ''));
    //#endregion
  };

  /**
   * Extract links to other Markdown files from a given Markdown content.
   * @param mdfileContent
   */
  export const getLinksToOtherMdFiles = (mdfileContent: string): string[] => {
    //#region @backendFunc
    // Regex pattern to match Markdown and HTML links to .md files
    const mdLinkPattern = /\[.*?\]\(([^)]+\.md)\)/g; // Matches [text](link.md)
    // const htmlLinkPattern = /<a\s+href=["']([^"']+\.md)["'].*?>/g; // Matches <a href="link.md">

    const links = new Set<string>(); // Use a Set to avoid duplicate links

    // Find all Markdown-style links
    let match;
    while ((match = mdLinkPattern.exec(mdfileContent)) !== null) {
      links.add(match[1]);
    }

    // Find all HTML-style links
    // while ((match = htmlLinkPattern.exec(mdfileContent)) !== null) {
    //   links.add(match[1]);
    // }

    return Array.from(links); // Convert Set to Array and return
    //#endregion
  };

  /**
   * Move asset paths to a higher directory level by adding "../" before each path.
   *
   * @param mdfileContent - The content of the .md file.
   * @param level - The number of levels to go up (default is 1).
   * @returns The modified content with updated asset paths.
   */
  export const moveAssetsPathesToLevel = (
    mdfileContent: string,
    level = 1,
  ): string => {
    //#region @backendFunc
    mdfileContent = mdfileContent || '';
    // Regular expressions for detecting assets
    const markdownImgRegex = /(!\[.*?\]\()(\.\/|\.\.\/.*?)(\))/g; // Matches ![alt](./path or ../path)
    const htmlImgRegex = /(<img.*?src=["'])(\.\/|\.\.\/.*?)(["'])/g; // Matches <img src="./path or ../path">

    // Calculate how many "../" segments to prepend based on the level
    const prefix = '../'.repeat(level);

    // Replace the paths in Markdown images
    const updatedMarkdown = mdfileContent.replace(
      markdownImgRegex,
      (_, prefixText, path, suffix) => {
        // Add the "../" prefix and normalize the path
        return `${prefixText}${prefix}${path.replace(/^\.\//, '').replace(/^\.\.\//, '')}${suffix}`;
      },
    );

    // Replace the paths in HTML images
    const updatedHtml = updatedMarkdown.replace(
      htmlImgRegex,
      (_, prefixText, path, suffix) => {
        // Add the "../" prefix and normalize the path
        return `${prefixText}${prefix}${path.replace(/^\.\//, '').replace(/^\.\.\//, '')}${suffix}`;
      },
    );

    return updatedHtml;
    //#endregion
  };
}
//#endregion

//#region utils quickfixes
export namespace UtilsQuickFixes {
  //#region replace sql-wasm.js faulty code content
  /**
   *
   * @param node_modules/sql.js/dist/sql-wasm.js
   */
  export const replaceSQLliteFaultyCode = (
    contentofSQLWasmJS: string,
  ): string => {
    //#region @backendFunc
    const replace = [
      [
        `var packageJson = JSON.parse(fs.readFileSync(__nccwpck_require__.ab ` +
          `+ "package.json").toString());`,
        `var packageJson = JSON.parse(fs.existsSync(__nccwpck_require__.ab + ` +
          `"package.json") && fs.readFileSync(__nccwpck_require__.ab + "package.json").toString());`,
      ],
      ['module = undefined;', '/* module = undefined ; */'],
    ];
    replace.forEach(r => {
      contentofSQLWasmJS = contentofSQLWasmJS.replace(r[0], r[1]);
    });
    return contentofSQLWasmJS;
    //#endregion
  };
  //#endregion

  /**
   * for some reason electron is being bundled - and it is not needed for cli
   */
  export const replaceElectronWithNothing = (
    jsContent: string,
    packageName: string,
  ): string => {
    //#region @backendFunc
    return jsContent.replace(
      `mod${'ule.exports'} = ${'requ' + 'ire'}("${packageName}");`,
      `/* --- replaced ${packageName} --- */`,
    );
    //#endregion
  };
}
//#endregion

//#region utils vscode
export namespace UtilsVSCode {
  export const calculateContrastingHexColor = (hex: string): string => {
    // Normalize shorthand format like "#abc" → "#aabbcc"
    if (hex.length === 4) {
      hex =
        '#' +
        hex
          .slice(1)
          .split('')
          .map(ch => ch + ch)
          .join('');
    }

    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    // YIQ contrast formula
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;

    return yiq >= 128 ? '#000000' : '#ffffff';
  };

  // Convert HSL to HEX if you need HEX output
  const hslToHex = (hsl: string): string => {
    const [_, hStr, sStr, lStr] = hsl.match(/hsl\((\d+), (\d+)%?, (\d+)%?\)/)!;
    let h = parseInt(hStr) / 360;
    let s = parseInt(sStr) / 100;
    let l = parseInt(lStr) / 100;

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // achromatic
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    const toHex = (x: number) => {
      const hex = Math.round(x * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  export const generateFancyColor = (): string => {
    const h = Math.floor(Math.random() * 360); // full hue range
    const s = Math.floor(40 + Math.random() * 30); // 40–70% saturation
    const l = Math.floor(35 + Math.random() * 25); // 35–60% lightness

    return hslToHex(`hsl(${h}, ${s}%, ${l}%)`);
  };
}

//#endregion
