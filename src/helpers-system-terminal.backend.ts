import { Helpers } from './index';

export class HelpersTerminal {
  runInNewInstance(command: string, cwd = process.cwd()) {
    if (process.platform === 'darwin') {

      return Helpers.run(`osascript <<END
tell app "Terminal"
  do script "cd ${cwd} && ${command}"
end tell
END`).sync()
    }

    return Helpers.run(`cd ${cwd} && gnome-terminal -e "${command}"`).sync()
  }
}
