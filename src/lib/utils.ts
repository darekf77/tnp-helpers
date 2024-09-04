//#region imports
import { _, chalk, CoreModels, Helpers, Utils } from 'tnp-core/src';
//#region @backend
import {
  createPrinter,
  createSourceFile,
  factory,
  getLeadingCommentRanges,
  isSourceFile,
  NodeArray,
  ScriptKind,
  ScriptTarget,
  SourceFile,
  Statement,
  transform,
  TransformationContext,
  visitEachChild,
} from 'typescript';
//#endregion
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

//#region utils terminal
export namespace UtilsTerminal {
  //#region transform choices
  const transformChoices = (
    choices: any,
  ): { name: string; value: string }[] => {
    //#region @backendFunc
    if (!_.isArray(choices) && _.isObject(choices)) {
      choices = Object.keys(choices)
        .map(key => {
          return {
            name: choices[key].name,
            value: key,
          };
        })
        .reduce((a, b) => a.concat(b), []);
    }
    return choices.map(c => ({ name: c.name, value: c.value }));
    //#endregion
  };
  //#endregion

  //#region multiselect
  export const multiselect = async <T = string>(options: {
    question: string;
    /**
     * If true, then only one choice can be selected
     */
    onlyOneChoice?: boolean;
    choices:
      | { name: string; value: T }[]
      | { [choice: string]: { name: string } };
    autocomplete?: boolean;
    defaultSelected?: string[];
  }): Promise<T[]> => {
    //#region @backendFunc
    const { select } = await import('inquirer-select-pro');
    const fuzzy = await import('fuzzy');
    options = _.cloneDeep(options);
    options.autocomplete = _.isNil(options.autocomplete)
      ? true
      : options.autocomplete;
    const choices = transformChoices(options.choices);

    const defaultValue = options.defaultSelected || [];
    // console.log({ defaultValue, choices });
    const res = await select({
      message: options.question,
      // options: choices,
      clearInputWhenSelected: true,
      emptyText: '<< No results >>',
      multiple: !options.onlyOneChoice,
      canToggleAll: true,
      pageSize: 10,
      loop: true,
      defaultValue,
      options: !options.autocomplete
        ? choices
        : (input = '') => {
            if (!input) {
              return choices;
            }
            const fuzzyResult = fuzzy.filter(
              input,
              choices.map(f => f.name),
            );
            return fuzzyResult.map(el => {
              return {
                name: el.original,
                value: choices.find(c => c.name === el.original).value,
              };
            });
          },
    });

    return (Array.isArray(res) ? res : [res]) as T[];

    //#region old autocomplete
    // const prompt = new AutoComplete({
    //   name: 'value',
    //   message: question,
    //   limit: 10,
    //   multiple: true,
    //   choices,
    //   initial: (selected || []).map(s => s.name),
    //   // selected,
    //   hint: '- Space to select. Return to submit',
    //   footer() {
    //     return CLI.chalk.green('(Scroll up and down to reveal more choices)');
    //   },
    //   result(names) {
    //     return _.values(this.map(names)) || [];
    //   },
    // });

    // const res = await prompt.run();
    //#endregion

    //#region old inquirer
    // const res = (await inquirer.prompt({
    //   type: 'checkbox',
    //   name: 'value',
    //   message: question,
    //   default: selected.map(s => s.name),
    //   choices,
    //   pageSize: 10,
    //   loop: false,
    // } as any)) as any;
    // return res.value;
    //#endregion
    //#endregion
  };
  //#endregion

  //#region select
  export const select = async <T = string>(options: {
    question: string;
    choices:
      | { name: string; value: T }[]
      | { [choice: string]: { name: string } };
    autocomplete?: boolean;
    defaultSelected?: string;
  }): Promise<T> => {
    //#region @backendFunc
    options = _.cloneDeep(options);
    options.autocomplete = _.isNil(options.autocomplete)
      ? true
      : options.autocomplete;
    const choices = transformChoices(options.choices);
    const { AutoComplete, Select } = require('enquirer');
    let preselectedIndex =
      choices.findIndex(c => c.value === options.defaultSelected) || 0;
    if (preselectedIndex === -1) {
      preselectedIndex = 0;
    }
    const prompt = new (options.autocomplete ? AutoComplete : Select)({
      name: 'value',
      message: options.question,
      limit: 10,
      multiple: false,
      initial: preselectedIndex,
      choices,
      hint: '- Space to select. Return to submit',
      footer() {
        return chalk.green('(Scroll up and down to reveal more choices)');
      },
    });

    const res = await prompt.run();
    return res;

    //#region does not work
    // const choice = await multiselect<T>({
    //   ...{
    //     question,
    //     choices,
    //     autocomplete,
    //     defaultSelected: [defaultSelected],
    //   },
    //   onlyOneChoice: true,
    // });
    // return _.first(choice) as T;
    //#endregion

    //#endregion
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
}
//#endregion
