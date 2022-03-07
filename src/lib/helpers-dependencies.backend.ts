import { _ } from 'tnp-core';
import { CLI } from 'tnp-cli';
import { Helpers } from './index';
import { Project } from './project';

export class HelpersDependencies {
  sort<P extends Project = Project>(deps: { project: P; copyto: P[] }[]) {
    // return deps;
    let last_currentProjIndex: number;
    let last_indexToReplace: number;
    while (true) {
      const depsProjs = deps.map(p => p.project);
      // Helpers.log('\n' + depsProjs.map((p, i) => `${i}. ${p.name}`).join('\n') + '\n', 1)
      let continueAgain = false;
      for (let currentProjIndex = 0; currentProjIndex < deps.length; currentProjIndex++) {
        // const proj = deps[currentProjIndex].project;
        // const copyto = deps[currentProjIndex].copyto;

        const copytoIndexes = deps[currentProjIndex].copyto
          .filter(p => p.location !== deps[currentProjIndex].project.location)
          .map(p => depsProjs.indexOf(p));
        const indexToReplace = copytoIndexes.filter(i => i !== currentProjIndex).find(i => {
          const result = i < currentProjIndex;
          Helpers.log(`${deps[i].project.name} index is less than project ${deps[currentProjIndex].project.name}`, 1)
          return result;
        });
        if (_.isNumber(indexToReplace)) {
          const v1 = deps[currentProjIndex];
          const v2 = deps[indexToReplace];
          if (v1.copyto.includes(v2.project) && (v2.copyto.includes(v1.project))) {
            Helpers.warn(`Circural copyto between ${CLI.chalk.bold(v1.project.name)}(${currentProjIndex}) `
              + ` and ${CLI.chalk.bold(v2.project.name)}(${indexToReplace})`)
          } else {
            // if (last_currentProjIndex === currentProjIndex && last_indexToReplace === indexToReplace) {
            //   Helpers.warn(`Weird circural copyto between ${chalk.bold(v1.project.name)}(${currentProjIndex}) `
            //     + ` and ${chalk.bold(v2.project.name)}(${indexToReplace})`)
            // } else {
            continueAgain = true;
            // Helpers.log(`${v1.project.name}(${currentProjIndex}) should be swapped with ${v2.project.name}(${indexToReplace})`, 1);
            deps[currentProjIndex] = v2;
            deps[indexToReplace] = v1;
            last_currentProjIndex = currentProjIndex;
            last_indexToReplace = indexToReplace;
            break;
            // }
          }

        }
      }
      if (continueAgain) {
        continue;
      }
      break;
    }

    const onlyWithZeros = deps.filter(c => c.copyto.length === 0);
    const onlyNormal = deps.filter(c => c.copyto.length > 0);
    onlyNormal.forEach(d => {
      onlyWithZeros.forEach(b => {
        if (!d.copyto.includes(b.project)) {
          d.copyto.push(b.project);
        }
      });
    });
    deps = [
      ...onlyNormal,
      ...onlyWithZeros,
    ];
    return deps;
  }


  recrusiveFind<P extends Project = Project>(
    currentProj: P, allAvailableProjects: P[], deps: P[] = [], orgProj?: P) {
    if (!orgProj) {
      orgProj = currentProj;
    }
    const availableDeps = allAvailableProjects
      .filter(p => !deps.includes(p))
      ;

    const depsToAppend = availableDeps.filter(p => {
      const res = p['packageJson'].hasDependency(currentProj.name, true);
      // if (res) {
      //   Helpers.log(`${chalk.bold(orgProj.name + '/' + currentProj.name)} ${p.name} has dependency ${currentProj.name}`);
      // }
      return res;
    })

    depsToAppend.forEach(p => deps.push(p));
    // console.log(`after appending deps ${chalk.bold(orgProj.name + '/' + currentProj.name)}`
    //   , deps.map(d => chalk.gray(d.name)).join(','))

    depsToAppend.forEach(p => {
      Helpers.deps.recrusiveFind(p, allAvailableProjects, deps, orgProj);
    });
    return deps;
  }

}
