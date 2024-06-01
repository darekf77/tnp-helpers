import { _, crossPlatformPath } from 'tnp-core/src';
import { CLI } from 'tnp-cli/src';
import { Helpers } from '../../index';


export class HelpersDependencies {

  async selectJava() {
    Helpers.clearConsole()
    const questions = (await Helpers
      .commnadOutputAsStringAsync('/usr/libexec/java_home -V', process.cwd(), {
        biggerBuffer: false,
        showWholeCommandNotOnlyLastLine: true
      }))
      .split('\n')
      .map(f => crossPlatformPath(f).trim())
      .filter(f => f.endsWith('Home'))
      .filter(f => {
        const [info, path] = f.split(' /');
        return (info && path);
      })
      .map(f => {
        const [info, path] = f.split(' /');
        return {
          name: info,
          value: `/${path}`
        }
      })

    const v = await Helpers.autocompleteAsk('Choose java sdk version:', questions);
    Helpers.terminal.copyText(`export JAVA_HOME=${v}`);
    Helpers.info(`press ctrl(cmd) - v  and then ENTER `);

    process.exit(0)
  }
}
