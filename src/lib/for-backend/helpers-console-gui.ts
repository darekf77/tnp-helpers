import { _ } from 'tnp-core';
import { Helpers } from '../index';


export class HelpersConsoleGuiQuestion {

  //#region @backend
  async yesNo(questionMessage: string) {
    return await Helpers.questionYesNo(questionMessage);
  };
  //#endregion

}

export class HelpersConsoleGui {

  constructor() {

  }

  question = new HelpersConsoleGuiQuestion();

  //#region @backend
  select = async <T = string>(
    questionMessage: string,
    choices: { name: string; value: T; }[]
  ) => {
    return await Helpers.list(questionMessage, choices);
  }
  //#endregion

  //#region @backend
  multiselect = async <T = string>(
    questionMessage: string,
    choices: { name: string; value: T; }[]
  ) => {
    return await Helpers.multipleChoicesAsk(questionMessage, choices);
  }
  //#endregion

  //#region @backend
  wait = async (howManySecondsWait: number) => {
    await Helpers.wait(howManySecondsWait);
  }
  //#endregion

  //#region @backend
  pressAnyKey = async (message = 'Press enter to continue..') => {
    await Helpers.pressKeyAndContinue(message);
  }
  //#endregion

}
