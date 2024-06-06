import { _ } from 'tnp-core/src';
import { Helpers } from '../../index';

export class HelpersConsoleGuiQuestion {
  //#region @backend
  async yesNo(questionMessage: string) {
    return await Helpers.questionYesNo(questionMessage);
  }
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
  select = async <T = string>(
    questionMessage: string,
    choices: { name: string; value: T }[],
    autocomplete?: boolean,
  ) => {
    if (autocomplete) {
      return await Helpers.selectChoicesAsk(questionMessage, choices);
    }
    return await Helpers.list(questionMessage, choices);
  };
  //#endregion
  //#endregion

  //#region multiselect
  //#region @backend
  multiselect = async (
    questionMessage: string,
    choices: { name: string; value: string }[],
    autocomplete?: boolean,
  ) => {
    return await Helpers.multipleChoicesAsk(
      questionMessage,
      choices,
      !!autocomplete,
    );
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
