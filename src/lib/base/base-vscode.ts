import { Helpers } from '../index';
import type { BaseProject } from './base-project';
import { BaseFeatureForProject } from './base-feature-for-project';

export class BaseVscodeHelpers<
  PROJCET extends BaseProject = any,
> extends BaseFeatureForProject {
  //#region extensions
  private get extensions(): string[] {
    return Helpers.uniqArray([
      //#region @backend
      'Angular.ng-template', // high cpu usage ??
      'EditorConfig.EditorConfig',
      'GitHub.copilot',
      'IBM.output-colorizer',
      'Mikael.Angular-BeastCode',
      'SimonSiefke.svg-preview',
      'Zaczero.bootstrap-v4-snippets',
      // 'abumalick.vscode-nvm', // test this before
      'aeschli.vscode-css-formatter',
      'alefragnani.Bookmarks',
      'alexdima.copy-relative-path',
      'alexiv.vscode-angular2-files',
      'amodio.toggle-excluded-files',
      'cg-cnu.vscode-path-tools',
      'chrisdias.vscode-opennewinstance',
      'ctcuff.font-preview',
      'dbaeumer.vscode-eslint',
      'dnicolson.binary-plist',
      'eamodio.gitlens',
      'eg2.tslint',
      'esbenp.prettier-vscode',
      'henry-li.vscode-import-formatter',
      'jack89ita.copy-filename',
      'johnpapa.Angular2',
      'marclipovsky.string-manipulation',
      'marinhobrandao.angular2tests',
      'mariusalchimavicius.json-to-ts',
      'maximus136.change-string-case',
      'mikebovenlander.formate',
      'momoko8443.library-version',
      'mrmlnc.vscode-json5',
      'ms-azuretools.vscode-docker',
      'ms-vscode.live-server',
      'msjsdiag.debugger-for-chrome',
      'natewallace.angular2-inline',
      'natqe.reload',
      'nemesv.copy-file-name',
      'oven.bun-vscode',
      'qwtel.sqlite-viewer',
      'redhat.vscode-xml',
      'ritwickdey.create-file-folder',
      'rogalmic.bash-debug',
      'rssowl.copy-relative-path-posix',
      'ryanlaws.toggle-case',
      'saber2pr.file-git-history',
      'shakram02.bash-beautify',
      'stepanog.angular1-inline',
      'taddison.gitlazy',
      'unifiedjs.vscode-mdx',
      // 'vespa-dev-works.jestrunit',
      'firsttris.vscode-jest-runner', // better for jest
      'waderyan.gitblame',
      'wcwhitehead.bootstrap-3-snippets',
      'wenfangdu.snippet-generator',
      'xabikos.javascriptsnippets',
      'wmaurer.vscode-jumpy',
      'nidu.copy-json-path',
      'aaron-bond.better-comments',
      'mikestead.dotenv',
      'ryu1kn.partial-diff',
      'Tyriar.sort-lines',
      'ms-vscode-remote.remote-containers',
      'ms-azuretools.vscode-docker',
      'DavidAnson.vscode-markdownlint',
      'bibhasdn.unique-lines',
      'streetsidesoftware.code-spell-checker',
      'pranaygp.vscode-css-peek',
      // 'bengreenier.vscode-node-readme',
      'kisstkondoros.vscode-codemetrics',
      'vscode-icons-team.vscode-icons',
      'Gruntfuggly.todo-tree',
      'ms-vscode-remote.remote-ssh',
      'tomoki1207.pdf',
      'hediet.vscode-drawio',
      'antfu.file-nesting',
      'streetsidesoftware.code-spell-checker',
      // 'shardulm94.trailing-spaces',
      //#endregion
    ]);
  }
  //#endregion

  //#region recreate extensions
  recreateExtensions(): void {
    //#region @backendFunc
    this.project.writeFile(
      '.vscode/extensions.json',
      JSON.stringify(
        {
          recommendations: this.extensions,
        },
        null,
        2,
      ),
    );
    //#endregion
  }
  //#endregion

  //#region settings
  recreateWindowTitle(): void {
    //#region @backendFunc
    this.project.setValueToJSONC(
      '.vscode/settings.json',
      '["window.title"]',
      `${this.project.titleBarName}` +
        ` (\${rootName}) [\${activeEditorShort}]`,
      // '${activeEditorShort}${separator}${rootName}',
    );
    // this.project.writeFile(
    //   '.vscode/settings.json',
    //   JSON.stringify({
    //     recommendations: this.extensions,
    //   }, null, 2),
    // );
    //#endregion
  }
  //#region
}
