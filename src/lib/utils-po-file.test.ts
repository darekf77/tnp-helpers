import { UtilsPoFile } from './utils-po-file';

describe('UtilsPoFile.extractPoToJson', () => {
  it('extracts translations from msgstr', () => {
    const po = `
msgid ""
msgstr ""
"Language: pl-PL\\n"
"Content-Type: text/plain; charset=UTF-8\\n"

#: src/lib/test.html:8
msgctxt "taon-ui"
msgid "You purchased"
msgstr "Kupiłeś"

#: src/lib/test.html:9
msgid "products"
msgstr "produkty"

#: src/lib/test.html:11
msgid "You purchased [[ howMany ]] products"
msgstr "Kupiłeś [[ howMany ]] produktów"
`;

    expect(UtilsPoFile.extractPoToJson(po)).toEqual([
      {
        fileAbsPath: 'src/lib/test.html',
        tags: [
          {
            lineNumber: 8,
            gettextString: 'You purchased',
            context: 'taon-ui',
            translation: 'Kupiłeś',
          },
          {
            lineNumber: 9,
            gettextString: 'products',
            context: undefined,
            translation: 'produkty',
          },
          {
            lineNumber: 11,
            gettextString: 'You purchased [[ howMany ]] products',
            context: undefined,
            translation: 'Kupiłeś [[ howMany ]] produktów',
          },
        ],
      },
    ]);
  });

  it('keeps empty msgstr as undefined', () => {
    const po = `
#: src/lib/test.html:1
msgid "Hello"
msgstr ""
`;

    expect(UtilsPoFile.extractPoToJson(po)).toEqual([
      {
        fileAbsPath: 'src/lib/test.html',
        tags: [
          {
            lineNumber: 1,
            gettextString: 'Hello',
            context: undefined,
            translation: undefined,
          },
        ],
      },
    ]);
  });
});

describe('UtilsPoFile.mergeGettextFile', () => {
  it('keeps translations from old po json and refreshes line numbers from source', () => {
    const freshFromSource: UtilsPoFile.GettextFile = {
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      fileRelativePath: 'src/lib/test.component.html',
      isAppFile: false,
      tags: [
        {
          lineNumber: 20,
          gettextString: 'You purchased',
          context: 'taon-ui',
        },
        {
          lineNumber: 21,
          gettextString: 'products',
        },
      ],
    };

    const oldFromPo: UtilsPoFile.GettextFile = {
      fileAbsPath: 'src/lib/test.component.html',
      tags: [
        {
          lineNumber: 8,
          gettextString: 'You purchased',
          context: 'taon-ui',
          translation: 'Kupiłeś',
        },
        {
          lineNumber: 9,
          gettextString: 'products',
          translation: 'produkty',
        },
      ],
    };

    expect(UtilsPoFile.mergeGettextFile(freshFromSource, oldFromPo)).toEqual({
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      fileRelativePath: 'src/lib/test.component.html',
      isAppFile: false,
      tags: [
        {
          lineNumber: 20,
          gettextString: 'You purchased',
          context: 'taon-ui',
          translation: 'Kupiłeś',
        },
        {
          lineNumber: 21,
          gettextString: 'products',
          translation: 'produkty',
        },
      ],
    });
  });

  it('returns fresh source tags when old po json does not exist', () => {
    const freshFromSource: UtilsPoFile.GettextFile = {
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      fileRelativePath: 'src/lib/test.component.html',
      isAppFile: false,
      tags: [
        {
          lineNumber: 1,
          gettextString: 'Hello',
        },
      ],
    };

    expect(UtilsPoFile.mergeGettextFile(freshFromSource, null)).toEqual({
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      fileRelativePath: 'src/lib/test.component.html',
      isAppFile: false,
      tags: [
        {
          lineNumber: 1,
          gettextString: 'Hello',
          translation: undefined,
        },
      ],
    });
  });

  it('does not keep translations for removed source strings', () => {
    const freshFromSource: UtilsPoFile.GettextFile = {
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      tags: [
        {
          lineNumber: 1,
          gettextString: 'Still exists',
        },
      ],
    };

    const oldFromPo: UtilsPoFile.GettextFile = {
      fileAbsPath: 'src/lib/test.component.html',
      tags: [
        {
          lineNumber: 1,
          gettextString: 'Still exists',
          translation: 'Nadal istnieje',
        },
        {
          lineNumber: 2,
          gettextString: 'Removed',
          translation: 'Usunięte',
        },
      ],
    };

    expect(UtilsPoFile.mergeGettextFile(freshFromSource, oldFromPo)).toEqual({
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      fileRelativePath: undefined,
      isAppFile: undefined,
      tags: [
        {
          lineNumber: 1,
          gettextString: 'Still exists',
          translation: 'Nadal istnieje',
        },
      ],
    });
  });

  it('matches context and empty context separately', () => {
    const freshFromSource: UtilsPoFile.GettextFile = {
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      tags: [
        {
          lineNumber: 1,
          gettextString: 'Save',
        },
        {
          lineNumber: 2,
          gettextString: 'Save',
          context: 'admin',
        },
      ],
    };

    const oldFromPo: UtilsPoFile.GettextFile = {
      fileAbsPath: 'src/lib/test.component.html',
      tags: [
        {
          lineNumber: 10,
          gettextString: 'Save',
          translation: 'Zapisz',
        },
        {
          lineNumber: 11,
          gettextString: 'Save',
          context: 'admin',
          translation: 'Zapisz admina',
        },
      ],
    };

    expect(UtilsPoFile.mergeGettextFile(freshFromSource, oldFromPo)).toEqual({
      fileAbsPath: 'c:/project/src/lib/test.component.html',
      fileRelativePath: undefined,
      isAppFile: undefined,
      tags: [
        {
          lineNumber: 1,
          gettextString: 'Save',
          translation: 'Zapisz',
        },
        {
          lineNumber: 2,
          gettextString: 'Save',
          context: 'admin',
          translation: 'Zapisz admina',
        },
      ],
    });
  });
});
