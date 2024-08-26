//#region imports
import { _, chalk, CoreModels, Helpers, Utils } from 'tnp-core/src';
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
