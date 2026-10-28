import { UtilsTypescript } from './utils-typescript';

describe('UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc', () => {
  it('should NOT wrap nested functions', () => {
    const input = `
class Test {
  getBuyProducts() {
    return async req => {
      const userId = Number(req.userId);

      const nested = () => {
        return userId;
      };

      return nested();
    };
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(
      result.match(
        new RegExp(`\\/\\/#${'reg' + 'ion'} @${'web' + 'sql' + 'Func'}`, 'g'),
      ),
    ).toHaveLength(1);
  });

  it('should wrap class method body', () => {
    const input = `
class Test {
  hello() {
    return 'hello';
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
  hello() {
    //${'#reg' + 'ion'} ${'@websqlFunc'}
    return 'hello';
    //#endregion
  }
`);
  });

  it('should wrap getter body', () => {
    const input = `
class Test {
  get value(): number {
    return 123;
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
  get value(): number {
    //${'#reg' + 'ion'} ${'@websqlFunc'}
    return 123;
    //#endregion
  }
`);
  });

  it('should wrap setter body', () => {
    const input = `
class Test {
  private _value = 0;

  set value(value: number) {
    this._value = value;
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
  set value(value: number) {
    //${'#reg' + 'ion'} ${'@websqlFunc'}
    this._value = value;
    //#endregion
  }
`);
  });

  it('should wrap normal function body', () => {
    const input = `
function hello() {
  return 'hello';
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
function hello() {
  //${'#reg' + 'ion'} ${'@websqlFunc'}
  return 'hello';
  //#endregion
}
`);
  });

  it('should wrap namespace function body', () => {
    const input = `
namespace Test {
  export function hello() {
    return 'hello';
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
  export function hello() {
    //${'#reg' + 'ion'} ${'@websqlFunc'}
    return 'hello';
    //#endregion
  }
`);
  });

  it('should wrap arrow function with block body', () => {
    const input = `
const hello = () => {
  return 'hello';
};
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
const hello = () => {
  //${'#reg' + 'ion'} ${'@websqlFunc'}
  return 'hello';
  //#endregion
};
`);
  });

  it('should wrap function expression body', () => {
    const input = `
const hello = function () {
  return 'hello';
};
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
const hello = function () {
  //${'#reg' + 'ion'} ${'@websqlFunc'}
  return 'hello';
  //#endregion
};
`);
  });

  it('should preserve existing regions inside whole body', () => {
    const input = `
class Test {
  hello() {
    //#region something important
    const a = 1;
    const b = 2;
    //#endregion

    //#region another region
    console.log(a + b);
    //#endregion

    return a + b;
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
  hello() {
    //${'#reg' + 'ion'} ${'@websqlFunc'}
    //#region something important
    const a = 1;
    const b = 2;
    //#endregion

    //#region another region
    console.log(a + b);
    //#endregion

    return a + b;
    //#endregion
  }
`);

    // Make absolutely sure existing region names survived.
    expect(result).toContain('//#region something important');
    expect(result).toContain('//#region another region');
  });

  //   it('should preserve existing nested backend regions', () => {
  //     const input = `
  // class Test {
  //   hello() {
  //     //#region @backendFunc
  //     const backend = true;
  //     //#endregion

  //     //#region @browser
  //     const browser = true;
  //     //#endregion

  //     return backend;
  //   }
  // }
  // `;

  //     const result =
  //       UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

  //     expect(result).toContain('//${'#reg'+'ion'} ${'@websqlFunc'}');
  //     expect(result).toContain('//#region @backendFunc');
  //     expect(result).toContain('//#region @browser');

  //     expect(result).toContain(`
  //   hello() {
  //     //${'#reg'+'ion'} ${'@websqlFunc'}
  //     //#region @backendFunc
  //     const backend = true;
  //     //#endregion

  //     //#region @browser
  //     const browser = true;
  //     //#endregion

  //     return backend;
  //     //#endregion
  //   }
  // `);
  //   });

  it('should NOT wrap body again when already wrapped with @websqlFunc', () => {
    const input = `
class Test {
  hello() {
    //${'#reg' + 'ion'} ${'@websqlFunc'}
    return 'hello';
    //#endregion
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toBe(input);

    expect(
      result.match(
        new RegExp(`\\/\\/#${'reg' + 'ion'} @${'web' + 'sql' + 'Func'}`, 'g'),
      ),
    ).toHaveLength(1);
  });

  it('should be idempotent', () => {
    const input = `
class Test {
  hello() {
    //#region existing region
    const value = 123;
    //#endregion

    return value;
  }

  get value() {
    return 123;
  }

  set value(value: number) {
    console.log(value);
  }
}

namespace Utils {
  export function foo() {
    return 'foo';
  }

  export const bar = () => {
    return 'bar';
  };
}
`;

    const once =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    const twice =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(once);

    expect(twice).toBe(once);
  });

  it('should preserve deeply nested regions', () => {
    const input = `
class Test {
  hello() {
    //#region level 1
    if (true) {
      //#region level 2
      if (true) {
        //#region level 3
        console.log('hello');
        //#endregion
      }
      //#endregion
    }
    //#endregion
  }
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`//${'#reg' + 'ion'} ${'@websqlFunc'}`);
    expect(result).toContain('//#region level 1');
    expect(result).toContain('//#region level 2');
    expect(result).toContain('//#region level 3');

    expect(result.match(/\/\/#region level 1/g)).toHaveLength(1);
    expect(result.match(/\/\/#region level 2/g)).toHaveLength(1);
    expect(result.match(/\/\/#region level 3/g)).toHaveLength(1);
  });

  it('should handle empty body', () => {
    const input = `
class Test {
  hello() {}
}
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toContain(`
  hello() {
    //${'#reg' + 'ion'} ${'@websqlFunc'}
    //#endregion
  }
`);
  });

  it('should ignore declarations without implementation', () => {
    const input = `
interface Test {
  hello(): void;
}

abstract class Base {
  abstract hello(): void;
}

declare function foo(): void;
`;

    const result =
      UtilsTypescript.wrapClassesNamespacesMethodsBodyWithWebsqlFunc(input);

    expect(result).toBe(input);
    expect(result).not.toContain('@websqlFunc');
  });
});
