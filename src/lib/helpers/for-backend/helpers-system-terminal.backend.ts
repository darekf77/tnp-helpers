import { crossPlatformPath } from 'tnp-core/src';

import { Helpers, UtilsClipboard } from '../../index';

export class HelpersTerminal {
  /**
   * @deprecated use UtilsClipboard.copyText instead
   */
  async copyText(textToCopy: string): Promise<void> {
    await UtilsClipboard.copyText(textToCopy);
  }

  /**
   * @deprecated use UtilsClipboard.pasteText instead
   */
  async pasteText(): Promise<string> {
    return await UtilsClipboard.pasteText();
  }
}
