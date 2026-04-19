import { TaonBaseClass } from 'taon/src';
import { BaseProjectResolver } from 'tnp-helpers/src';

class Proj extends TaonBaseClass {
  static from(proj: Partial<Proj>) {
    return new Proj().clone(proj);
  }

  declare location: string;
  declare name: string;
  declare port: string | number;
  declare dependencies: string[];
}

describe('Base Projects Resolver', () => {
  // it('should sort projects in proper dependency order', () => {
  //   const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');
  //   const pizda = 1;
  //   expect(1).toBe(pizda);
  // });

  //#region should sort projects in proper dependency order
  it('should sort projects in proper dependency order', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const unsortedProj = [
      // main app depending on backend + ui
      Proj.from({
        name: 'app',
        location: '/app',
        port: 3000,
        dependencies: ['backend', 'ui'],
      }),

      // ui depending on core
      Proj.from({
        name: 'ui',
        location: '/ui',
        port: 3001,
        dependencies: ['core'],
      }),

      // backend depending on db + core
      Proj.from({
        name: 'backend',
        location: '/backend',
        port: 3002,
        dependencies: ['db', 'core'],
      }),

      // leaf/core libs
      Proj.from({
        name: 'core',
        location: '/core',
        port: 3003,
        dependencies: [],
      }),

      Proj.from({
        name: 'db',
        location: '/db',
        port: 3004,
        dependencies: [],
      }),

      // independent project
      Proj.from({
        name: 'docs',
        location: '/docs',
        port: 3005,
        dependencies: [],
      }),

      // depends on app
      Proj.from({
        name: 'e2e',
        location: '/e2e',
        port: 3006,
        dependencies: ['app'],
      }),

      // edge case: dependency that does not exist in group
      Proj.from({
        name: 'storybook',
        location: '/storybook',
        port: 3007,
        dependencies: ['ui', 'missing-lib'],
      }),

      // edge case: duplicated dependency
      Proj.from({
        name: 'admin',
        location: '/admin',
        port: 3008,
        dependencies: ['ui', 'ui', 'backend'],
      }),
    ];

    const sorted = resolver.sortGroupOfProject<Proj>(
      unsortedProj,
      proj => proj.dependencies || [],
      proj => proj.name,
    );

    const names = sorted.map(p => p.name);

    // all projects should still be present
    expect(names).toHaveLength(unsortedProj.length);
    expect(new Set(names).size).toBe(unsortedProj.length);

    // basic dependency order checks
    expect(names.indexOf('core')).toBeLessThan(names.indexOf('ui'));
    expect(names.indexOf('core')).toBeLessThan(names.indexOf('backend'));
    expect(names.indexOf('db')).toBeLessThan(names.indexOf('backend'));
    expect(names.indexOf('ui')).toBeLessThan(names.indexOf('app'));
    expect(names.indexOf('backend')).toBeLessThan(names.indexOf('app'));
    expect(names.indexOf('app')).toBeLessThan(names.indexOf('e2e'));

    // admin depends on ui + backend
    expect(names.indexOf('ui')).toBeLessThan(names.indexOf('admin'));
    expect(names.indexOf('backend')).toBeLessThan(names.indexOf('admin'));

    // storybook depends on ui, but missing-lib should not break sorting
    expect(names.indexOf('ui')).toBeLessThan(names.indexOf('storybook'));

    // independent projects should still exist
    expect(names).toContain('docs');
    expect(names).toContain('storybook');
  });
  //#endregion

  //#region should handle already sorted input'
  it('should handle already sorted input', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({ name: 'core', location: '/core', port: 1, dependencies: [] }),
      Proj.from({
        name: 'ui',
        location: '/ui',
        port: 2,
        dependencies: ['core'],
      }),
      Proj.from({
        name: 'app',
        location: '/app',
        port: 3,
        dependencies: ['ui'],
      }),
    ];

    const sorted = resolver.sortGroupOfProject<Proj>(
      projects,
      proj => proj.dependencies || [],
      proj => proj.name,
    );

    expect(sorted.map(p => p.name)).toEqual(['core', 'ui', 'app']);
  });
  //#endregion

  //#region should handle projects with no dependencies
  it('should handle projects with no dependencies', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({ name: 'b', location: '/b', port: 1, dependencies: [] }),
      Proj.from({ name: 'a', location: '/a', port: 2, dependencies: [] }),
      Proj.from({ name: 'c', location: '/c', port: 3, dependencies: [] }),
    ];

    const sorted = resolver.sortGroupOfProject<Proj>(
      projects,
      proj => proj.dependencies || [],
      proj => proj.name,
    );

    expect(sorted.map(p => p.name).sort()).toEqual(['a', 'b', 'c']);
    expect(sorted).toHaveLength(3);
  });
  //#endregion

  //#region should handle deep dependency chain
  it('should handle deep dependency chain', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({
        name: 'proj4',
        location: '/4',
        port: 4,
        dependencies: ['proj3'],
      }),
      Proj.from({
        name: 'proj2',
        location: '/2',
        port: 2,
        dependencies: ['proj1'],
      }),
      Proj.from({
        name: 'proj3',
        location: '/3',
        port: 3,
        dependencies: ['proj2'],
      }),
      Proj.from({ name: 'proj1', location: '/1', port: 1, dependencies: [] }),
    ];

    const sorted = resolver.sortGroupOfProject<Proj>(
      projects,
      proj => proj.dependencies || [],
      proj => proj.name,
    );

    const names = sorted.map(p => p.name);

    expect(names.indexOf('proj1')).toBeLessThan(names.indexOf('proj2'));
    expect(names.indexOf('proj2')).toBeLessThan(names.indexOf('proj3'));
    expect(names.indexOf('proj3')).toBeLessThan(names.indexOf('proj4'));
  });
  //#endregion

  //#region should not crash for circular dependencies (if resolver supports graceful handling)
  it('should crash for circular dependencies (if resolver supports graceful handling)', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({ name: 'a', location: '/a', port: 1, dependencies: ['b'] }),
      Proj.from({ name: 'b', location: '/b', port: 2, dependencies: ['c'] }),
      Proj.from({ name: 'c', location: '/c', port: 3, dependencies: ['a'] }),
    ];

    expect(() =>
      resolver.sortGroupOfProject<Proj>(
        projects,
        proj => proj.dependencies || [],
        proj => proj.name,
      ),
    ).toThrow();
  });
  //#endregion
});

describe('Base Projects Resolver same ports', () => {
  it('should keep projects with same name when unique key includes port', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({
        name: 'proj1',
        location: '/1',
        port: 1,
        dependencies: [],
      }),
      Proj.from({
        name: 'proj1',
        location: '/1',
        port: 2,
        dependencies: [],
      }),
    ];

    const sorted = resolver.sortGroupOfProject<Proj>(
      projects,
      proj => proj.dependencies || [],
      proj => proj.name,
      proj => `${proj.name}___${proj.port}`,
    );

    expect(sorted).toHaveLength(2);

    expect(sorted.map(p => `${p.name}___${p.port}`)).toEqual(
      expect.arrayContaining(['proj1___1', 'proj1___2']),
    );
  });

  it('should include all matching dependency projects when dependency is resolved by name', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({
        name: 'app',
        location: '/app',
        port: 100,
        dependencies: ['proj1'],
      }),
      Proj.from({
        name: 'proj1',
        location: '/1',
        port: 1,
        dependencies: [],
      }),
      Proj.from({
        name: 'proj1',
        location: '/1',
        port: 2,
        dependencies: [],
      }),
    ];

    const sorted = resolver.sortGroupOfProject<Proj>(
      projects,
      proj => proj.dependencies || [],
      proj => proj.name,
      proj => `${proj.name}___${proj.port}`,
    );

    const names = sorted.map(p => `${p.name}___${p.port}`);

    expect(names).toHaveLength(3);
    expect(names).toEqual(
      expect.arrayContaining(['proj1___1', 'proj1___2', 'app___100']),
    );

    expect(names.indexOf('proj1___1')).toBeLessThan(names.indexOf('app___100'));
    expect(names.indexOf('proj1___2')).toBeLessThan(names.indexOf('app___100'));
  });

  it('should apply override order using unique key', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({
        name: 'proj1',
        location: '/1',
        port: 1,
        dependencies: [],
      }),
      Proj.from({
        name: 'proj1',
        location: '/1',
        port: 2,
        dependencies: [],
      }),
      Proj.from({
        name: 'proj2',
        location: '/2',
        port: 3,
        dependencies: [],
      }),
    ];

    const sorted = resolver.sortGroupOfProject<Proj>(
      projects,
      proj => proj.dependencies || [],
      proj => proj.name,
      proj => `${proj.name}___${proj.port}`,
      ['proj1___2', 'proj1___1'],
    );

    const names = sorted.map(p => `${p.name}___${p.port}`);

    expect(names.indexOf('proj1___2')).toBeLessThan(names.indexOf('proj1___1'));
    expect(names).toEqual(
      expect.arrayContaining(['proj1___1', 'proj1___2', 'proj2___3']),
    );
  });

  it('should throw for circular dependency based on unique instances', () => {
    const resolver = new BaseProjectResolver(Proj, () => 'test-cli-dummy');

    const projects = [
      Proj.from({
        name: 'proj1',
        location: '/1',
        port: 1,
        dependencies: ['proj2'],
      }),
      Proj.from({
        name: 'proj2',
        location: '/2',
        port: 2,
        dependencies: ['proj1'],
      }),
    ];

    expect(() =>
      resolver.sortGroupOfProject<Proj>(
        projects,
        proj => proj.dependencies || [],
        proj => proj.name,
        proj => `${proj.name}___${proj.port}`,
      ),
    ).toThrow(/Circular dependency detected/);
  });
});
