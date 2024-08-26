import { _ } from 'tnp-core/src';
import { Helpers, UtilsTerminal } from '../../index';

export class HelpersConsoleGuiQuestion {
  //#region qestion yes / no
  //#region @backend
  async yesNo(questionMessage: string) {
    return await Helpers.questionYesNo(questionMessage);
  }
  //#endregion
  //#endregion
}

export class HelpersConsoleGui {
  constructor() {}

  question = new HelpersConsoleGuiQuestion();

  //#region input
  get input() {
    return Helpers.input;
  }
  //#endregion

  //#region select
  //#region @backend
  /**
   * @deprecated use UtilsTerminal.select
   */
  select = async <T = string>(
    questionMessage: string,
    choices:
      | { name: string; value: T }[]
      | { [choice: string]: { name: string } },
    autocomplete?: boolean,
  ): Promise<T> => {
    if (autocomplete) {
      return (await Helpers.selectChoicesAsk(questionMessage, choices)) as T;
    }
    return (await Helpers.list(questionMessage, choices)) as T;
  };
  //#endregion
  //#endregion

  //#region multiselect
  //#region @backend
  /**
   * @deprecated use UtilsTerminal.multiselect
   */
  multiselect = async (
    questionMessage: string,
    choices: { name: string; value: string }[],
    autocomplete?: boolean,
    selected?: { name: string; value: string }[],
  ) => {
    return UtilsTerminal.multiselect({
      autocomplete,
      choices,
      question: questionMessage,
      defaultSelected: (selected || []).map(s => s.value),
    });
  };
  //#endregion
  //#endregion

  //#region wait
  //#region @backend
  wait = async (howManySecondsWait: number) => {
    await Helpers.wait(howManySecondsWait);
  };
  //#endregion
  //#endregion

  //#region press any key
  //#region @backend
  pressAnyKey = async (message = 'Press enter to continue..') => {
    await Helpers.pressKeyAndContinue(message);
  };
  //#endregion
  //#endregion
}
