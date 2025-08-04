import { execSync } from 'child_process';

import { fse, os, path, UtilsTerminal } from 'tnp-core/src';

import { BaseFeatureForProject } from './base-feature-for-project';
import { BaseProject } from './base-project';

export class BaseJavaJdk<
  PROJECT extends BaseProject = any,
> extends BaseFeatureForProject<PROJECT> {
  //#region api methods / selectJdkVersion
  async selectJdkVersion(): Promise<string> {
    //#region @backendFunc
    const platform = os.platform();
    let currentJava = '';
    let currentJavaLocation = '';

    try {
      currentJava = execSync('java -version 2>&1').toString().split('\n')[0];
      currentJavaLocation = execSync('which java').toString().trim();
    } catch {
      currentJava = '-- no selected --';
      currentJavaLocation = '--';
    }

    console.log(`\nCURRENT JAVA GLOBAL VERSION: ${currentJava}`);
    if (currentJavaLocation && currentJavaLocation !== '--') {
      console.log(`FROM: ${currentJavaLocation}\n`);
    }

    let javaVersions: { version: string; path: string }[] = [];

    if (platform === 'darwin') {
      try {
        const result = execSync('/usr/libexec/java_home -V 2>&1')
          .toString()
          .split('\n')
          .filter(l => l.trim().startsWith('/Library'))
          .map(l => {
            const match = l.match(/(\/Library\/.*\/Contents\/Home)/);
            if (match) {
              const version =
                l.match(/(?:jdk-|JDK )([\d._]+)/)?.[1] ?? 'unknown';
              return { version, path: match[1] };
            }
          })
          .filter(Boolean) as { version: string; path: string }[];

        javaVersions = result;
      } catch (err) {
        console.warn('No Java versions found via /usr/libexec/java_home');
      }
    } else if (platform === 'linux') {
      try {
        const output = execSync(
          'update-java-alternatives -l || ls /usr/lib/jvm',
          { shell: '/bin/bash' },
        ).toString();
        javaVersions = output
          .split('\n')
          .filter(Boolean)
          .map(line => {
            const segments = line.trim().split(/\s+/);
            const version = segments[0];
            const pathGuess = segments[2] || `/usr/lib/jvm/${segments[0]}`;
            return { version, path: pathGuess };
          });
      } catch {
        // Fallback using /usr/lib/jvm
        javaVersions = execSync('ls /usr/lib/jvm')
          .toString()
          .split('\n')
          .filter(Boolean)
          .map(dir => ({
            version: dir,
            path: `/usr/lib/jvm/${dir}`,
          }));
      }
    } else if (platform === 'win32') {
      try {
        const output = execSync(
          'reg query "HKLM\\SOFTWARE\\JavaSoft\\Java Development Kit"',
          {
            encoding: 'utf8',
          },
        );
        const lines = output
          .split('\n')
          .filter(line => line.trim().length > 0 && line.includes('HKLM'));
        javaVersions = lines.map(l => {
          const version = l.split('\\').pop()!;
          const pathOutput = execSync(`reg query "${l.trim()}" /v JavaHome`, {
            encoding: 'utf8',
          });
          const match = pathOutput.match(/JavaHome\s+REG_SZ\s+(.+)/);
          return {
            version,
            path: match?.[1].trim() ?? '',
          };
        });
      } catch {
        javaVersions = [];
      }

      // ✅ Fallback to checking typical install folders
      const fallbackDirs = [
        'C:\\Program Files\\Amazon Corretto',
        'C:\\Program Files\\Java',
      ];

      for (const baseDir of fallbackDirs) {
        try {
          const subdirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of subdirs) {
            if (
              dir.isDirectory() &&
              (dir.name.startsWith('jdk') ||
                dir.name.toLowerCase().includes('corretto'))
            ) {
              javaVersions.push({
                version: dir.name,
                path: path.join(baseDir, dir.name),
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (javaVersions.length === 0) {
      console.log('❌ No installed Java versions found.');
      return;
    }

    const selected = await UtilsTerminal.select({
      question: 'Select Java version to use globally:',
      choices: javaVersions.map(j => ({
        name: `${j.version}  —  ${j.path}`,
        value: j,
      })),
    });

    const selectedPath = selected.path;
    return selectedPath;
    //#endregion
  }
  //#endregion

  //#region api methods / updateJavaHomePath
  updateJavaHomePath(selectedPath: string): void {
    //#region @backendFunc
    const platform = os.platform();

    if (platform === 'darwin') {
      try {
        const shellPath = path.resolve(os.homedir(), '.zshrc'); // or .bash_profile
        execSync(`export JAVA_HOME="${selectedPath}"`);
        console.log(
          `✅ JAVA_HOME set to ${selectedPath} (only in current session).`,
        );
        console.log(
          `To make permanent, add to your shell profile:\n\nexport JAVA_HOME="${selectedPath}"\n`,
        );
      } catch (err) {
        console.error('❌ Failed to set JAVA_HOME on macOS.');
      }
    } else if (platform === 'linux') {
      try {
        execSync(`export JAVA_HOME="${selectedPath}"`);
        execSync(
          `sudo update-alternatives --set java "${selectedPath}/bin/java"`,
        );
        console.log(`✅ Set global Java to ${selectedPath}`);
      } catch {
        console.log(
          `⚠️ Could not update alternatives. Try manually:\nexport JAVA_HOME="${selectedPath}"`,
        );
      }
    } else if (platform === 'win32') {
      try {
        execSync(`setx JAVA_HOME "${selectedPath}"`);
        console.log(`✅ JAVA_HOME set globally to ${selectedPath}`);
        console.log(`⚠️ Restart your terminal or computer to apply changes.`);
      } catch {
        console.error('❌ Failed to set JAVA_HOME on Windows.');
      }
    }
    //#endregion
  }
  //#endregion

  //#region api methods / selectTomcatVersion
  async selectTomcatVersion(): Promise<string> {
    //#region @backendFunc
    const platform = os.platform();
    let currentTomcat = process.env.TOMCAT_HOME || '';
    let tomcatVersions: { version: string; path: string }[] = [];

    console.log('\n🔍 Searching for installed Tomcat versions...');

    if (currentTomcat) {
      console.log(`CURRENT TOMCAT_HOME: ${currentTomcat}\n`);
    }

    if (platform === 'darwin' || platform === 'linux') {
      // Extended search directories for macOS/Linux
      const searchDirs = [
        '/usr/local', // will check for tomcat* here
        '/opt',
        '/usr/share',
        path.join(os.homedir(), 'tomcat'),
      ];

      for (const base of searchDirs) {
        try {
          if (!fse.existsSync(base)) continue;
          const subdirs = fse.readdirSync(base, { withFileTypes: true });
          for (const sub of subdirs) {
            if (
              sub.isDirectory() &&
              sub.name.toLowerCase().includes('tomcat')
            ) {
              const foundPath = path.join(base, sub.name);
              const versionGuess =
                sub.name.match(/(\d+\.\d+\.\d+)/)?.[1] || sub.name;
              tomcatVersions.push({
                version: versionGuess,
                path: foundPath,
              });
            }
          }
        } catch {
          // ignore errors
        }
      }
    } else if (platform === 'win32') {
      const fallbackDirs = [
        'C:\\Program Files\\Apache Software Foundation',
        'C:\\Tomcat',
      ];
      for (const baseDir of fallbackDirs) {
        try {
          if (!fse.existsSync(baseDir)) continue;
          const subdirs = fse.readdirSync(baseDir, { withFileTypes: true });
          for (const dir of subdirs) {
            if (
              dir.isDirectory() &&
              dir.name.toLowerCase().includes('tomcat')
            ) {
              const foundPath = path.join(baseDir, dir.name);
              const versionGuess =
                dir.name.match(/(\d+\.\d+\.\d+)/)?.[1] || dir.name;
              tomcatVersions.push({
                version: versionGuess,
                path: foundPath,
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    if (tomcatVersions.length === 0) {
      console.log('❌ No Tomcat installations found.');
      return;
    }

    const selected = await UtilsTerminal.select({
      question: 'Select Tomcat installation to use globally:',
      choices: tomcatVersions.map(t => ({
        name: `Tomcat ${t.version} — ${t.path}`,
        value: t,
      })),
    });

    const selectedPath = selected.path;
    return selectedPath;
    //#endregion
  }
  //#endregion

  //#region api methods / updateTomcatHomePath
  updateTomcatHomePath(selectedPath: string): void {
    //#region @backendFunc
    const platform = os.platform();
    if (platform === 'darwin' || platform === 'linux') {
      try {
        execSync(`export TOMCAT_HOME="${selectedPath}"`);
        console.log(
          `✅ TOMCAT_HOME set to ${selectedPath} (current session only).`,
        );
        console.log(
          `To make permanent, add to your ~/.zshrc or ~/.bashrc:\n\nexport TOMCAT_HOME="${selectedPath}"\n`,
        );
      } catch {
        console.error('❌ Failed to set TOMCAT_HOME.');
      }
    } else if (platform === 'win32') {
      try {
        execSync(`setx TOMCAT_HOME "${selectedPath}"`);
        console.log(`✅ TOMCAT_HOME set globally to ${selectedPath}`);
        console.log(`⚠️ Restart your terminal or computer to apply changes.`);
      } catch {
        console.error('❌ Failed to set TOMCAT_HOME on Windows.');
      }
    }
    //#endregion
  }
  //#endregion
}
