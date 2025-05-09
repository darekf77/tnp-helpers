import { Utils } from 'tnp-core/src';
// import { getVscode } from 'tnp-helpers/src';
import { CommandType, executeCommand } from 'tnp-helpers/src';
import type { ExtensionContext } from 'vscode';

const group = 'Tnp Helpers CLI essentials';

export const commands: CommandType[] = (
  [
    {
      title: 'hello world',
    },
    {
      title: 'hey!',
    },
  ] as CommandType[]
).map(c => {
  if (!c.command) {
    c.command = `extension.${Utils.camelize(c.title)}`;
  }
  if (!c.group) {
    c.group = group;
  }
  return c;
});

export function activate(context: ExtensionContext) {
  // const vscode = getVscode();
  // const outputChannel = vscode.window.createOutputChannel('EXTENSION');
  // outputChannel.show();
  for (let index = 0; index < commands.length; index++) {
    const {
      title = '',
      command = '',
      exec = '',
      options,
      isDefaultBuildCommand,
    } = commands[index];
    // outputChannel.appendLine(`title: ${title}, command: ${command}, group: ${group}`);
    const sub = executeCommand(
      title,
      command,
      exec,
      options,
      isDefaultBuildCommand,
      context,
    );
    if (sub) {
      context.subscriptions.push(sub);
    }
  }
}

export function deactivate() {}

export default { commands };


