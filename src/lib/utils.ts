//#region imports
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'; // @backend

import { config } from 'tnp-config/src';
import {
  child_process,
  crossPlatformPath,
  fse,
  os,
  path,
  UtilsOs,
  UtilsTerminal,
} from 'tnp-core/src';
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
import type * as vscodeType from 'vscode';

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
      `${major}.${minor}.${patch}${
        alphaOrBetaOrRc ? '.' + alphaOrBetaOrRc : ''
      }`,
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
    return `${major}.${minor}.${patch}${
      alphaOrBetaOrRc ? '.' + alphaOrBetaOrRc : ''
    }`;
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

  export interface ExportInfo {
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
    options?: {
      skipAddIfNotExists?: boolean;
      useRawStringValue?: boolean;
    },
  ): void => {
    //#region @backendFunc
    const sourceText = Helpers.readFile(tsAbsFilePath);
    const sourceFile = createSourceFile(
      tsAbsFilePath,
      sourceText,
      ScriptTarget.Latest,
      /*setParentNodes */ true,
    );
    options = options || {};
    const addIfNotExists = !options.skipAddIfNotExists;

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
                  if (options.useRawStringValue) {
                    initializer = factory.createIdentifier(valueOfVariable);
                  } else {
                    initializer = factory.createStringLiteral(valueOfVariable);
                  }
                } else if (typeof valueOfVariable === 'number') {
                  initializer = factory.createNumericLiteral(valueOfVariable);
                } else {
                  // Fallback: wrap JSON string => parse with TS
                  // Or you can create a more sophisticated approach for arrays/objects
                  if (valueOfVariable === undefined) {
                    console.warn(`[${config.frameworkName}-helpers][setValueToVariableInTsFile]
                      
                      SETTING VALUE OF VARIABLE TO UNDEFINED "${variableName}"
                      
                      `);
                    initializer = factory.createIdentifier('undefined');
                  } else {
                    initializer = factory.createIdentifier(
                      JSON.stringify(valueOfVariable),
                    );
                  }
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
    //#region @websqlFunc
    if (text.startsWith('`')) return 'tics';
    if (text.startsWith("'")) return 'single';
    return 'double';
    //#endregion
  };
  //#endregion

  const extractImportExportElements = (node: ts.Node): string[] => {
    //#region @websqlFunc
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
    //#endregion
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
    //#region @websqlFunc
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
    //#endregion
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

  export const clearRequireCacheRecursive = (
    modulePath: string,
    seen = new Set<string>(),
  ): void => {
    //#region @backendFunc
    const resolvedPath = require.resolve(modulePath);
    const mod = require.cache[resolvedPath];

    if (!mod || seen.has(resolvedPath)) return;

    seen.add(resolvedPath);

    // Recursively clear children
    for (const child of mod.children) {
      clearRequireCacheRecursive(child.id, seen);
    }

    delete require.cache[resolvedPath];
    //#endregion
  };

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
        return `${prefixText}${prefix}${path
          .replace(/^\.\//, '')
          .replace(/^\.\.\//, '')}${suffix}`;
      },
    );

    // Replace the paths in HTML images
    const updatedHtml = updatedMarkdown.replace(
      htmlImgRegex,
      (_, prefixText, path, suffix) => {
        // Add the "../" prefix and normalize the path
        return `${prefixText}${prefix}${path
          .replace(/^\.\//, '')
          .replace(/^\.\.\//, '')}${suffix}`;
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
  export const replaceKnownFaultyCode = (
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
      [
        `var packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")).toString());`,
        `var packageJson = JSON.parse(fs.existsSync(path.join(__dirname, "../package.json")) &&` +
          ` fs.readFileSync(path.join(__dirname, "../package.json")).toString());`,
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
    return jsContent
      .replace(
        new RegExp(
          Utils.escapeStringForRegEx(
            `mod${'ule.exports'} = ${'requ' + 'ire'}("${packageName}");`,
          ),
          'g',
        ),
        `/* --- replaced ${packageName} --- */`,
      )
      .replace(
        new RegExp(
          Utils.escapeStringForRegEx(
            `var ${_.snakeCase(packageName)}_1 = ${'req' + 'uire'}("${packageName}");`,
          ),
          'g',
        ),
        `/* --- replaced ${packageName} --- */`,
      );
    // var electron_1 = require("electron");
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

  export const vscodeImport = () => {
    //#region @backendFunc
    if (!UtilsOs.isRunningInVscodeExtension()) {
      return {} as typeof vscodeType;
    }
    const vscode = require('vsc' + 'ode');
    return vscode as typeof vscodeType;
    //#endregion
  };
}

//#endregion

//#region utils dot file
export namespace UtilsDotFile {
  //#region parse value from dot file util
  const parseValue = (rawValue: string): string | number | boolean => {
    const val = rawValue.trim().replace(/^"|"$/g, '');

    // Try boolean
    if (val.toLowerCase() === 'true') return true;
    if (val.toLowerCase() === 'false') return false;

    // Try number
    if (!isNaN(Number(val)) && val !== '') return Number(val);

    return val;
  };
  //#endregion

  //#region set value to/from dot file
  export const setValueToDotFile = (
    dotFileAbsPath: string | string[],
    key: string,
    value: string | number | boolean,
  ): void => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);
    let envContent = '';
    if (fse.existsSync(dotFileAbsPath)) {
      envContent = Helpers.readFile(dotFileAbsPath, '');
    } else {
      // Create file if it doesn't exist
      Helpers.writeFile(dotFileAbsPath, '');
      Helpers.logInfo(
        `[${config.frameworkName}-helpers] Created ${path.basename(dotFileAbsPath)}`,
      );
      envContent = '';
    }

    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(envContent)) {
      // Replace existing
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      // Append new
      if (envContent.length > 0 && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${key}=${value}\n`;
    }

    Helpers.writeFile(dotFileAbsPath, envContent);
    Helpers.info(
      `[${config.frameworkName}-helpers] Updated ${path.basename(dotFileAbsPath)}: ${key}=${value}`,
    );
    //#endregion
  };
  //#endregion

  //#region set comment to key in dot file
  export const setCommentToKeyInDotFile = (
    dotFileAbsPath: string | string[],
    key: string,
    comment: string,
  ): void => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);

    let envContent = '';
    if (fse.existsSync(dotFileAbsPath)) {
      envContent = Helpers.readFile(dotFileAbsPath, '');
    } else {
      Helpers.writeFile(dotFileAbsPath, '');
      Helpers.logInfo(
        `[${config.frameworkName}-helpers] Created ${path.basename(dotFileAbsPath)}`,
      );
      envContent = '';
    }

    // Regex: match line starting with "KEY=" and capture value part
    const regex = new RegExp(`^(${key}=[^#\\n]*)(?:#.*)?$`, 'm');

    if (regex.test(envContent)) {
      // Replace existing comment (strip old, append new)
      envContent = envContent.replace(regex, `$1 # ${comment}`);
    } else {
      // Append as new entry with empty value but with comment
      if (envContent.length > 0 && !envContent.endsWith('\n')) {
        envContent += '\n';
      }
      envContent += `${key}= # ${comment}\n`;
    }

    Helpers.writeFile(dotFileAbsPath, envContent);
    Helpers.info(
      `[${config.frameworkName}-helpers] Updated comment for ${key} in ${path.basename(dotFileAbsPath)}`,
    );
    //#endregion
  };
  //#endregion

  //#region get value from dot file
  export const getValueFromDotFile = (
    dotFileAbsPath: string | string[],
    key: string,
  ): string | number | boolean => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);
    if (!fse.existsSync(dotFileAbsPath)) {
      Helpers.warn(
        `[${config.frameworkName}-helpers] File ${path.basename(dotFileAbsPath)} does not exist.`,
      );
      return;
    }

    const envContent = fse.readFileSync(dotFileAbsPath, 'utf-8');

    // Parse line by line
    const lines = envContent.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [k, ...rest] = trimmed.split('=');
      if (k === key) {
        return parseValue(rest.join('='));
      }
    }
    //#endregion
  };
  //#endregion

  //#region set values keys from object
  export const setValuesKeysFromObject = (
    dotFileAbsPath: string | string[],
    obj: Record<string, string | number | boolean>,
    options?: {
      /**
       * if true, it will overwrite existing keys
       */
      setAsNewFile?: boolean;
    },
  ): void => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);
    options = options || {};

    let envContent = options.setAsNewFile
      ? ''
      : Helpers.readFile(dotFileAbsPath, '');

    for (const [key, value] of Object.entries(obj)) {
      const stringValue = String(value);
      const regex = new RegExp(`^${key}=.*$`, 'm');

      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${stringValue}`);
      } else {
        if (envContent.length > 0 && !envContent.endsWith('\n')) {
          envContent += '\n';
        }
        envContent += `${key}=${stringValue}\n`;
      }
    }

    Helpers.writeFile(dotFileAbsPath, envContent);
    //#endregion
  };
  //#endregion

  //#region get values keys as json object
  export const getValuesKeysAsJsonObject = <
    T = Record<string, string | number | boolean>,
  >(
    dotFileAbsPath: string | string[],
  ): T => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);

    if (!Helpers.exists(dotFileAbsPath)) {
      return {} as T;
    }
    const envContent = Helpers.readFile(dotFileAbsPath, '');

    const result: Record<string, string | number | boolean> = {};
    const lines = envContent.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const [key, ...rest] = trimmed.split('=');
      if (key) {
        result[key] = parseValue(rest.join('='));
      }
    }

    return result as T;
    //#endregion
  };
  //#endregion

  //#region get comments keys as json object
  /**
   * @returns key|comment pairs as json object
   */
  export const getCommentsKeysAsJsonObject = <
    T = Record<string, string | undefined>,
  >(
    dotFileAbsPath: string | string[],
  ): T => {
    //#region @backendFunc
    dotFileAbsPath = crossPlatformPath(dotFileAbsPath);

    if (!Helpers.exists(dotFileAbsPath)) {
      return {} as T;
    }

    const envContent = Helpers.readFile(dotFileAbsPath, '');
    const result: Record<string, string | undefined> = {};
    const lines = envContent.split(/\r?\n/);

    const extractInlineComment = (valuePart: string): string | undefined => {
      // Find the first unquoted `#`
      let inSingle = false;
      let inDouble = false;
      let escaped = false;

      for (let i = 0; i < valuePart.length; i++) {
        const ch = valuePart[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (ch === '\\') {
          escaped = true;
          continue;
        }

        if (!inDouble && ch === "'") {
          inSingle = !inSingle;
          continue;
        }

        if (!inSingle && ch === '"') {
          inDouble = !inDouble;
          continue;
        }

        if (!inSingle && !inDouble && ch === '#') {
          // Everything after '#' is the comment
          const raw = valuePart.slice(i + 1);
          const comment = raw.replace(/^\s+/, ''); // trim only leading spaces after '#'
          return comment.length ? comment : '';
        }
      }

      return undefined;
    };

    for (const line of lines) {
      const raw = line;
      const trimmed = raw.trim();

      // Skip empty or full-line comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Support optional leading `export `
      const withoutExport = trimmed.startsWith('export ')
        ? trimmed.slice('export '.length).trim()
        : trimmed;

      const eqIdx = withoutExport.indexOf('=');
      if (eqIdx === -1) continue;

      const key = withoutExport.slice(0, eqIdx).trim();
      if (!key) continue;

      const valuePart = withoutExport.slice(eqIdx + 1);

      result[key] = extractInlineComment(valuePart);
    }

    return result as T;
    //#endregion
  };
  //#endregion
}
//#endregion

//#region utils zip browser
export namespace UtilsZipBrowser {
  // <input type="file" id="folderInput" webkitdirectory />
  // ts
  // Copy
  // Edit
  // document.getElementById('folderInput').addEventListener('change', async (e) => {
  //   const input = e.target as HTMLInputElement;
  //   if (input.files) {
  //     const zipBlob = await zipDirBrowser(input.files);
  //     // Save the zip using FileSaver.js or URL.createObjectURL
  //     const url = URL.createObjectURL(zipBlob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = 'folder.zip';
  //     a.click();
  //     URL.revokeObjectURL(url);
  //   }
  // });

  // import JSZip from 'jszip';

  //   <input type="file" id="zipInput" />
  // ts
  // Copy
  // Edit
  // document.getElementById('zipInput').addEventListener('change', async (e) => {
  //   const input = e.target as HTMLInputElement;
  //   if (input.files?.[0]) {
  //     const entries = await unzipArchiveBrowser(input.files[0]);
  //     for (const [name, blob] of entries) {
  //       console.log(`Extracted file: ${name}`, blob);
  //     }
  //   }
  // });
  export const zipDirBrowser = async (fileList: FileList): Promise<Blob> => {
    //   const zip = new JSZip();

    //   for (const file of Array.from(fileList)) {
    //     const relativePath = (file as any).webkitRelativePath || file.name;
    //     zip.file(relativePath, file);
    //   }

    //   return zip.generateAsync({ type: 'blob' });
    return void 0;
  };

  export const unzipArchiveBrowser = async (
    zipBlob: Blob,
  ): Promise<Map<string, Blob>> => {
    //   const zip = await JSZip.loadAsync(zipBlob);
    //   const files = new Map<string, Blob>();

    //   for (const [filePath, fileObj] of Object.entries(zip.files)) {
    //     if (!fileObj.dir) {
    //       const content = await fileObj.async('blob');
    //       files.set(filePath, content);
    //     }
    //   }

    //   return files;
    return void 0;
  };
}
//#endregion

//#region utils zip node
export namespace UtilsZip {
  //#region split zip file

  export const splitFile7Zip = async (
    inputPath: string,
    partSizeMB = 99,
  ): Promise<number> => {
    //#region @backendFunc
    const stat = fse.statSync(inputPath);
    const partSize = partSizeMB * 1024 * 1024;

    if (stat.size <= partSize) {
      console.log('File is smaller than part size — no split needed.');
      return 0;
    }

    const { path7za } = await import('7zip-bin');

    const baseName = path.basename(inputPath, path.extname(inputPath));
    const dirname = path.dirname(inputPath);
    const output7zPath = path.join(dirname, `${baseName}.7z`);

    return new Promise((resolve, reject) => {
      const args = [
        'a', // Add to archive
        output7zPath,
        inputPath,
        `-v${partSizeMB}m`, // ✅ Volume split flag
        '-mx=0', // No compression (optional: speeds it up)
      ];

      const proc = child_process.spawn(path7za, args, { stdio: 'inherit' });

      proc.on('close', async code => {
        if (code !== 0)
          return reject(new Error(`7za failed with code ${code}`));

        try {
          const files = await fse.readdir(dirname);
          const partFiles = files.filter(
            f =>
              f.startsWith(`${baseName}.7z.`) &&
              /^[0-9]{3}$/.test(f.split('.').pop() || ''),
          );

          const count = partFiles.length;
          console.log(`✅ Created ${count} part(s):`, partFiles);
          resolve(count);
        } catch (err) {
          reject(err);
        }
      });
    });
    //#endregion
  };

  /**
   * Splits a file into smaller parts if its size exceeds the specified part size.
   * @returns true if file was split, false if not needed
   */
  export const splitFile = async (
    inputPath: string,
    partSizeMB = 99,
  ): Promise<number> => {
    //#region @backendFunc
    const stat = fse.statSync(inputPath);
    const partSize = partSizeMB * 1024 * 1024;

    if (stat.size <= partSize) {
      console.log('File is smaller than part size — no split needed.');
      return 0;
    }

    return await new Promise<number>((resolve, reject) => {
      const baseName = path.basename(inputPath);
      const dirname = path.dirname(inputPath);
      const input = fse.createReadStream(inputPath);
      let partIndex = 0;
      let written = 0;
      let currentStream = fse.createWriteStream(`${baseName}.part${partIndex}`);

      input.on('data', chunk => {
        let offset = 0;

        while (offset < chunk.length) {
          if (written >= partSize) {
            currentStream.end();
            partIndex++;
            currentStream = fse.createWriteStream(
              crossPlatformPath([dirname, `${baseName}.part${partIndex}`]),
            );
            written = 0;
          }

          const toWrite = Math.min(partSize - written, chunk.length - offset);
          currentStream.write(chunk.slice(offset, offset + toWrite));
          written += toWrite;
          offset += toWrite;
        }
      });

      input.on('end', () => {
        currentStream.end(() => {
          console.log(`✅ Done splitting into ${partIndex + 1} parts.`);
          resolve(partIndex + 1);
        });
      });

      input.on('error', reject);
      currentStream.on('error', reject);
    });
    //#endregion
  };
  //#endregion

  /**
   * @returns absolute path to zip file
   */
  export const zipDir = async (
    absPathToDir: string,
    options?: {
      /**
       * default false
       */
      overrideIfZipFileExists?: boolean;
    },
  ): Promise<string> => {
    //#region @backendFunc
    const zipPath = `${absPathToDir}.zip`;
    const destinationFileName = crossPlatformPath([
      path.dirname(absPathToDir),
      zipPath,
    ]);
    if (options.overrideIfZipFileExists) {
      try {
        Helpers.removeFileIfExists(destinationFileName);
      } catch (error) {}
    }
    if (Helpers.exists(destinationFileName)) {
      Helpers.info(
        `[${config.frameworkName}-helpers] Zip file already exists: ${destinationFileName}`,
      );
      return destinationFileName;
    }
    const yazl = await import('yazl'); // Use default import for yazl
    const pipeline = (await import('stream/promises')).pipeline;

    const zipfile = new yazl.ZipFile();
    const addDirectoryToZip = async (dir: string, basePath: string) => {
      const entries = await fse.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(basePath, fullPath).replace(/\\/g, '/');
        if (entry.isDirectory()) {
          await addDirectoryToZip(fullPath, basePath);
        } else if (entry.isFile()) {
          zipfile.addFile(fullPath, relPath);
        }
      }
    };
    await addDirectoryToZip(absPathToDir, absPathToDir);
    zipfile.end();
    await pipeline(zipfile.outputStream, fse.createWriteStream(zipPath));
    return destinationFileName;
    //#endregion;
  };

  // Unzip: `/some/path/folder.zip` → `/some/path/folder`
  export const unzipArchive = async (absPathToZip: string): Promise<void> => {
    //#region @backendFunc
    const yauzl = await import('yauzl'); // Use default import for yauzl
    const { mkdir, stat } = await import('fs/promises'); // Use default import for fs
    const pipeline = (await import('stream/promises')).pipeline;

    const extractTo = absPathToZip.replace(/\.zip$/, '');
    await mkdir(extractTo, { recursive: true });
    return new Promise<void>((resolve, reject) => {
      yauzl.open(absPathToZip, { lazyEntries: true }, (err, zipfile) => {
        if (err || !zipfile) return reject(err);
        zipfile.readEntry();
        zipfile.on('entry', async entry => {
          const filePath = path.join(extractTo, entry.fileName);
          if (/\/$/.test(entry.fileName)) {
            await mkdir(filePath, { recursive: true });
            zipfile.readEntry();
          } else {
            await mkdir(path.dirname(filePath), { recursive: true });
            zipfile.openReadStream(entry, async (err, readStream) => {
              if (err || !readStream) return reject(err);
              const writeStream = fse.createWriteStream(filePath);
              await pipeline(readStream, writeStream);
              zipfile.readEntry();
            });
          }
        });
        zipfile.on('end', () => resolve());
        zipfile.on('error', reject);
      });
    });
    //#endregion
  };
}
//#endregion

//#region utils worker
export namespace UtilsTaonWorker {
  export const getUniqueForTask = (
    task: string,
    location: string | string[],
  ): string => {
    if (!location) {
      throw new Error(
        '[UtilsTaonWorker.getUniqueForTask()] Location must be provided',
      );
    }
    if (!task) {
      throw new Error(
        '[UtilsTaonWorker.getUniqueForTask()] Task must be provided',
      );
    }
    location = crossPlatformPath(location);
    return `task(${task?.trim()}) in ${location}`?.trim();
  };
}
//#endregion

//#region utils java
export namespace UtilsJava {
  //#region select jdk version
  export const selectJdkVersion = async (): Promise<string | undefined> => {
    //#region @backendFunc
    Helpers.taskStarted(`Looking for JDK versions...`);
    const platform = os.platform();
    let currentJava = '';
    let currentJavaLocation = '';

    try {
      currentJava = child_process
        .execSync('java -version 2>&1')
        .toString()
        .split('\n')[0];
      currentJavaLocation = child_process
        .execSync('which java')
        .toString()
        .trim();
    } catch {
      currentJava = '-- no selected --';
      currentJavaLocation = '--';
    }

    console.log(`\nCURRENT JAVA GLOBAL VERSION: ${currentJava}`);
    if (currentJavaLocation !== '--') {
      console.log(`FROM: ${currentJavaLocation}\n`);
    }

    let javaVersions: { version: string; path: string }[] = [];

    if (platform === 'darwin') {
      try {
        const result = child_process
          .execSync('/usr/libexec/java_home -V 2>&1')
          .toString()
          .split('\n')
          .filter(l => l.includes('/Library/Java/JavaVirtualMachines'))
          .map(l => {
            const match = l.match(/(\/Library\/.*?\/Contents\/Home)/);
            if (match) {
              const version =
                l.match(/(?:jdk-|JDK )([\d._]+)/)?.[1] ?? 'unknown';
              return { version, path: match[1] };
            }
          })
          .filter(Boolean) as { version: string; path: string }[];

        javaVersions.push(...result);
      } catch {
        console.warn('No versions found via /usr/libexec/java_home');
      }

      // ✅ Extra fallback for Homebrew + Corretto
      const fallbackDirs = [
        '/Library/Java/JavaVirtualMachines',
        '/usr/local/Cellar',
        '/opt/homebrew/Cellar',
      ];

      for (const baseDir of fallbackDirs) {
        try {
          const dirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of dirs) {
            if (dir.isDirectory() && /(jdk|corretto|openjdk)/i.test(dir.name)) {
              // Cellar layout: .../openjdk@21/<version>/libexec/openjdk.jdk/Contents/Home
              const homePath = baseDir.includes('Cellar')
                ? path.join(
                    baseDir,
                    dir.name,
                    fse.readdirSync(path.join(baseDir, dir.name))[0],
                    'libexec',
                    'openjdk.jdk',
                    'Contents',
                    'Home',
                  )
                : path.join(baseDir, dir.name, 'Contents', 'Home');

              javaVersions.push({
                version: detectJavaVersionMacOS(homePath),
                path: homePath,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    } else if (platform === 'linux') {
      const knownPaths = ['/usr/lib/jvm', '/usr/java', '/opt/java', '/opt/jdk'];

      for (const basePath of knownPaths) {
        try {
          const dirs = fse.readdirSync(basePath, { withFileTypes: true });
          for (const dir of dirs) {
            if (dir.isDirectory() && /(jdk|java|corretto)/i.test(dir.name)) {
              const versionMatch = dir.name.match(/(\d+(?:\.\d+)+)/);
              javaVersions.push({
                version: versionMatch?.[1] ?? dir.name,
                path: path.join(basePath, dir.name),
              });
            }
          }
        } catch {
          // ignore
        }
      }
    } else if (platform === 'win32') {
      try {
        const output = child_process.execSync(
          'reg query "HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit"',
          { encoding: 'utf8' },
        );
        const lines = output
          .split('\n')
          .filter(line => line.includes('JavaSoft\\Java Development Kit'));
        for (const line of lines) {
          const version = line.trim().split('\\').pop()!;
          const pathOutput = child_process.execSync(
            `reg query "${line.trim()}" /v JavaHome`,
            {
              encoding: 'utf8',
            },
          );
          const match = pathOutput.match(/JavaHome\s+REG_SZ\s+(.+)/);
          if (match) {
            javaVersions.push({
              version,
              path: match[1].trim(),
            });
          }
        }
      } catch {
        // Ignore registry failure
      }

      // Fallback dirs
      const fallbackDirs = [
        'C:\\Program Files\\Amazon Corretto',
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Zulu',
        'C:\\Java',
      ];

      for (const baseDir of fallbackDirs) {
        try {
          const subdirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of subdirs) {
            if (
              dir.isDirectory() &&
              /(jdk|corretto|zulu|temurin)/i.test(dir.name)
            ) {
              const versionMatch = dir.name.match(/(\d+(?:\.\d+)+)/);
              javaVersions.push({
                version: versionMatch?.[1] ?? dir.name,
                path: path.join(baseDir, dir.name),
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    javaVersions = javaVersions
      .filter(j => j.version !== 'unknown') // drop unknowns
      .filter(
        (j, index, self) =>
          index ===
          self.findIndex(
            other => path.resolve(other.path) === path.resolve(j.path),
          ),
      );

    if (javaVersions.length === 0) {
      console.log('❌ No installed Java versions found.');
      return;
    }

    const selected = await UtilsTerminal.select({
      question: 'Select Java version for global usage:',
      choices: javaVersions.map(j => ({
        name: `${j.version}  —  ${j.path}`,
        value: j,
      })),
    });

    return selected.path;
    //#endregion
  };
  //#endregion

  export const detectJavaVersionMacOS = (javaHome: string): string => {
    //#region @backendFunc
    try {
      // 1. Try to read "release" file shipped with every JDK
      const releaseFile = path.join(javaHome, 'release');
      if (fse.existsSync(releaseFile)) {
        const content = fse.readFileSync(releaseFile, 'utf8');
        const match = content.match(/JAVA_VERSION="([^"]+)"/);
        if (match) {
          return match[1];
        }
      }

      // 2. Try folder name (amazon-corretto-21.jdk → 21, valhalla-ea-23 → 23)
      const folder = path.basename(javaHome);
      const matchFolder = folder.match(/(\d+(?:\.\d+)?)/);
      if (matchFolder) {
        return matchFolder[1];
      }

      return folder; // fallback: show folder name
    } catch {
      return 'unknown';
    }
    //#endregion
  };

  //#region update java home path
  export const updateJavaHomePath = (selectedPath: string): void => {
    //#region @backendFunc
    const platform = os.platform();

    if (platform === 'darwin') {
      try {
        const shellPath = path.resolve(UtilsOs.getRealHomeDir(), '.zshrc'); // or .bash_profile
        child_process.execSync(`export JAVA_HOME="${selectedPath}"`);
        console.log(
          `✅ JAVA_HOME set to ${selectedPath} (only in current session).`,
        );
        console.log(
          `To make permanent, add to your shell profile:\n\nexport JAVA_HOME="${selectedPath}"\n`,
        );
      } catch (err) {
        console.error('❌ Failed to set JAVA_HOME on macOS.');
      }
    } else if (platform === 'linux') {
      try {
        child_process.execSync(`export JAVA_HOME="${selectedPath}"`);
        child_process.execSync(
          `sudo update-alternatives --set java "${selectedPath}/bin/java"`,
        );
        console.log(`✅ Set global Java to ${selectedPath}`);
      } catch {
        console.log(
          `⚠️ Could not update alternatives. Try manually:\nexport JAVA_HOME="${selectedPath}"`,
        );
      }
    } else if (platform === 'win32') {
      try {
        child_process.execSync(`setx JAVA_HOME "${selectedPath}"`);
        console.log(`✅ JAVA_HOME set globally to ${selectedPath}`);
        console.log(`⚠️ Restart your terminal or computer to apply changes.`);
      } catch {
        console.error('❌ Failed to set JAVA_HOME on Windows.');
      }
    }
    //#endregion
  };
  //#endregion

  //#region api methods / selectTomcatVersion
  export const selectTomcatVersion = async (): Promise<string> => {
    //#region @backendFunc
    const platform = os.platform();
    let currentTomcat = process.env.TOMCAT_HOME || '';
    let tomcatVersions: { version: string; path: string }[] = [];

    console.log('\n🔍 Searching for installed Tomcat versions...');

    if (currentTomcat) {
      console.log(`CURRENT TOMCAT_HOME: ${currentTomcat}\n`);
    }

    if (platform === 'darwin' || platform === 'linux') {
      // Extended search directories for macOS/Linux
      const searchDirs = [
        '/usr/local', // will check for tomcat* here
        '/opt',
        '/usr/share',
        crossPlatformPath([UtilsOs.getRealHomeDir(), 'tomcat']),
      ];

      for (const base of searchDirs) {
        try {
          if (!fse.existsSync(base)) continue;
          const subdirs = fse.readdirSync(base, { withFileTypes: true });
          for (const sub of subdirs) {
            if (
              sub.isDirectory() &&
              sub.name.toLowerCase().includes('tomcat')
            ) {
              const foundPath = path.join(base, sub.name);
              const versionGuess =
                sub.name.match(/(\d+\.\d+\.\d+)/)?.[1] || sub.name;
              tomcatVersions.push({
                version: versionGuess,
                path: foundPath,
              });
            }
          }
        } catch {
          // ignore errors
        }
      }
    } else if (platform === 'win32') {
      const fallbackDirs = [
        'C:\\Program Files\\Apache Software Foundation',
        'C:\\Tomcat',
      ];
      for (const baseDir of fallbackDirs) {
        try {
          if (!fse.existsSync(baseDir)) continue;
          const subdirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of subdirs) {
            if (
              dir.isDirectory() &&
              dir.name.toLowerCase().includes('tomcat')
            ) {
              const foundPath = path.join(baseDir, dir.name);
              const versionGuess =
                dir.name.match(/(\d+\.\d+\.\d+)/)?.[1] || dir.name;
              tomcatVersions.push({
                version: versionGuess,
                path: foundPath,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (tomcatVersions.length === 0) {
      console.log('❌ No Tomcat installations found.');
      return;
    }

    const selected = await UtilsTerminal.select({
      question: 'Select Tomcat installation for global usage:',
      choices: tomcatVersions.map(t => ({
        name: `Tomcat ${t.version} — ${t.path}`,
        value: t,
      })),
    });

    const selectedPath = selected.path;
    return selectedPath;
    //#endregion
  };
  //#endregion

  //#region update tomcat home path
  export const updateTomcatHomePath = (selectedPath: string): void => {
    //#region @backendFunc
    const platform = os.platform();
    if (platform === 'darwin' || platform === 'linux') {
      try {
        child_process.execSync(`export TOMCAT_HOME="${selectedPath}"`);
        console.log(
          `✅ TOMCAT_HOME set to ${selectedPath} (current session only).`,
        );
        console.log(
          `To make permanent, add to your ~/.zshrc or ~/.bashrc:\n\nexport TOMCAT_HOME="${selectedPath}"\n`,
        );
      } catch {
        console.error('❌ Failed to set TOMCAT_HOME.');
      }
    } else if (platform === 'win32') {
      try {
        child_process.execSync(`setx TOMCAT_HOME "${selectedPath}"`);
        console.log(`✅ TOMCAT_HOME set globally to ${selectedPath}`);
        console.log(`⚠️ Restart your terminal or computer to apply changes.`);
      } catch {
        console.error('❌ Failed to set TOMCAT_HOME on Windows.');
      }
    }
    //#endregion
  };
  //#endregion
}

//#endregion

//#region utils passwords
export namespace UtilsPasswords {
  //#region hash password
  export const hashPassword = (password: string): Promise<string> => {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const salt = randomBytes(16);
      scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        // store salt + hash (hex or base64)
        resolve(salt.toString('hex') + ':' + derivedKey.toString('hex'));
      });
    });
    //#endregion
  };
  //#endregion

  //#region verify password
  export const verifyPassword = (
    password: string,
    stored: string,
  ): Promise<boolean> => {
    //#region @backendFunc
    return new Promise((resolve, reject) => {
      const [saltHex, keyHex] = stored.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const key = Buffer.from(keyHex, 'hex');

      scrypt(password, salt, key.length, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(timingSafeEqual(key, derivedKey));
      });
    });
    //#endregion
  };
  //#endregion

  // Example
  // (async () => {
  //   const hash = await hashPassword('super-secret');
  //   console.log('stored:', hash);

  //   const ok = await verifyPassword('super-secret', hash);
  //   console.log('valid?', ok);
  // })();
}
//#endregion
