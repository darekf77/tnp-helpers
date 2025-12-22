export class HelpersNumber {
  /**
   * @deprecated
   * use _.random()
   */
  randomInteger = (max, min) => Math.round(Math.random() * (max - min)) + min;

}