import { crossPlatformPath, os } from 'tnp-core/src';

import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';

export class BasePowerShellHelpers<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  get properPowerShellConfigOhMyPosh() {

    // "terminal.integrated.profiles.windows": {
    //   "PowerShell Core": {
    //     "path": "C:\\Users\\darek\\AppData\\Local\\Microsoft\\WindowsApps\\pwsh.exe"
    //   }
    // },

    // notepad $PROFILE
    //     `$env:PATH += ";${os.homedir()}\AppData\Local\Programs\oh-my-posh\bin"
    // oh-my-posh init pwsh --config "C:\Users\darek\AppData\Local\Programs\oh-my-posh\themes\jandedobbeleer.omp.json" | Invoke-Expression`
    // function readlink($Path) {
    //     (Get-Item $Path).Target
    // }

    // Set-ExecutionPolicy RemoteSigned -Scope CurrentUser


    const config = {
      $schema:
        'https://raw.githubusercontent.com/JanDeDobbeleer/oh-my-posh/main/themes/schema.json',
      console_title_template: '{{ .Folder }}',
      blocks: [
        {
          type: 'prompt',
          alignment: 'left',
          segments: [
            // {
            //   properties: {
            //     cache_duration: 'none',
            //   },
            //   template: '{{ .UserName }}@{{ .HostName }} ',
            //   foreground: '#00FF00',
            //   type: 'session',
            //   style: 'plain',
            // },
            {
              properties: {
                cache_duration: 'none',
              },
              template: 'POWERSHELL ',
              foreground: '#FF69B4',
              type: 'shell',
              style: 'plain',
            },
            // only basename
            {
              type: 'path',
              style: 'plain',
              template: '{{ .Folder }}',
              foreground: '#D4AF37',
              properties: {
                style: 'agnoster',
              },
            },
            // {
            //   properties: {
            //     cache_duration: 'none',
            //     style: 'full',
            //   },
            //   template: '{{ .Path }} ',
            //   foreground: '#D4AF37',
            //   type: 'path',
            //   style: 'plain',
            // },
            {
              properties: {
                branch_icon: '',
                cache_duration: 'none',
                display_stash_count: false,
                display_status: false,
                display_upstream_icon: false,
              },
              template: '({{ .HEAD }})',
              foreground: '#3399FF',
              type: 'git',
              style: 'plain',
            },
          ],
        },
      ],
      version: 3,
      final_space: true,
    };

    return {
      config,
      path: crossPlatformPath(
        `${os.homedir()}/AppData/Local/Programs/oh-my-posh/themes/jandedobbeleer.omp.json`,
      ),
    };
  }
}
