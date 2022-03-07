import { crossPlatformPath } from 'tnp-core';
import * as ncp from 'copy-paste';
import { Helpers } from './index';

export class HelpersTerminal {
  runInNewInstance(command: string, cwd = crossPlatformPath(process.cwd())) {
    if (process.platform === 'darwin') {

      return Helpers.run(`osascript <<END
tell app "Terminal"
  do script "cd ${cwd} && ${command}"
end tell
END`).sync()
    }

    return Helpers.run(`cd ${cwd} && gnome-terminal -e "${command}"`).sync()
  }

  async copyText(textToCopy: string): Promise<void> {
    await new Promise(resolve => {
      ncp.copy(textToCopy, function () {
        Helpers.log(`Copied to clipboard !`)
        resolve(void 0);
      })
    });
  }

  async pasteText(): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      ncp.paste(function (__, p) {
        Helpers.log(`Paster from to clipboard !`)
        resolve(p);
      })
    });
  }

}
