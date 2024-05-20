// session tab it
// realtime session

const key = Symbol('[firedev-helpers] helper browser key')

export class HelpersBrowser {

  private static callbacks = [];
  static onInit(callback: (ins: HelpersBrowser) => any) {
    this.callbacks.push(callback);
  }

  get win() {
    let win = window;
    return win;
  }

  private get tabIdSessionStorage() {
    return Number(this.win.sessionStorage?.tabId) || 0;
  }

  readonly tabId: number;

  private static inst: HelpersBrowser;
  init = (() => {
    const win = this.win;

    if (!win[key]) {
      win[key] = new HelpersBrowser(win);
    }
    HelpersBrowser.inst = win[key];
  })();

  private constructor(win: Window) {
    //#region @browser
    win.addEventListener("beforeunload", (e) => {
      win.sessionStorage.tabId = this.tabId;
      return null;
    });

    setTimeout(() => {

      if (win.sessionStorage?.tabId) {
        // @ts-ignore
        this.tabId = Number(win.sessionStorage.tabId);
        win.sessionStorage.removeItem("tabId");
      }
      else {
        // @ts-ignore
        this.tabId = Math.floor(Math.random() * 1000000) + (new Date()).getTime();
      }
      HelpersBrowser.callbacks.forEach((c) => {
        c(this);
      });
    })

    //#endregion
  }


  static get instance() {
    return HelpersBrowser.inst;
  }

}





