//#region imports
//#region @backend
import { crossPlatformPath, fse, Helpers, path } from 'tnp-core/src';
import * as express from 'express';
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
} from 'typescript';
//#endregion
import { _, chalk, CoreModels, Utils } from 'tnp-core/src';
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
  /**
   * Function to extract exports from a TypeScript file
   */
  export const exportsFromFile = (
    filePath: string,
  ): {
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
  }[] => {
    //#region @backendFunc
    // Read the content of the file
    const sourceCode = fse.readFileSync(filePath, 'utf-8');

    // Create a SourceFile object using the TypeScript API
    const sourceFile = createSourceFile(
      filePath,
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
  export const formatFile = (absPathToFile: string): void => {
    //#region @backendFunc
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
    }
    //#endregion
  };

  export const formatAllFilesInsideFolder = (absPathToFolder: string): void => {
    //#region @backendFunc
    if (Helpers.exists(absPathToFolder)) {
      const { execSync } = require('child_process');
      try {
        execSync(`prettier --write .`, { cwd: absPathToFolder });
      } catch (error) {
        console.warn(`Not able to files in: ${absPathToFolder}`);
      }
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
      require('fs').readFileSync(fileAbsPath, 'utf8'),
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
}

//#endregion

//#region utils http
export namespace UtilsHttp {
  //#region utils http / start http server
  export const startHttpServer = async (cwd: string, port: number) => {
    //#region @backendFunc
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
  export function replaceSQLliteFaultyCode(contentofSQLWasmJS: string): string {
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
  }
  //#endregion
}
//#endregion
