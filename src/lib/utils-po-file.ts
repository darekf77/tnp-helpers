import { mkdirSync, writeFileSync } from 'fs'; // @backend
import { join } from 'path';

import { UtilsI18n } from 'tnp-core/src';

import { UtilsTypescript } from './utils-typescript';

export namespace UtilsPoFile {
  //#region generate po files
  export function generatePoFiles(
    files: GettextFile[],
    locales: UtilsI18n.CommonLocaleCode[],
    destinationAbsFolderPath: string,
  ): void {
    //#region @backendFunc
    mkdirSync(destinationAbsFolderPath, { recursive: true });

    for (const locale of locales) {
      const poContent = generatePoFileContent(files, locale);
      const poFilePath = join(destinationAbsFolderPath, `${locale}.po`);

      writeFileSync(poFilePath, poContent, 'utf8');
    }
    //#endregion
  }
  //#endregion

  //#region generate po file content
  export function generatePoFileContent(
    files: GettextFile[],
    locale: UtilsI18n.CommonLocaleCode,
  ): string {
    //#region @backendFunc
    const entries = new Map<
      string,
      {
        msgid: string;
        context?: string;
        translation?: string;
        refs: string[];
      }
    >();

    for (const file of files) {
      for (const tag of file.tags) {
        const context = tag.context || '';
        const key = `${context}\u0004${tag.gettextString}`;

        let entry = entries.get(key);

        if (!entry) {
          entry = {
            msgid: tag.gettextString,
            context: tag.context,
            translation: tag.translation,
            refs: [],
          };
          entries.set(key, entry);
        }

        entry.refs.push(`${file.fileRelativePath}:${tag.lineNumber}`);
      }
    }

    const lines: string[] = [];

    lines.push('msgid ""');
    lines.push('msgstr ""');
    lines.push(`"Language: ${escapePoString(locale)}\\n"`);
    lines.push('"Content-Type: text/plain; charset=UTF-8\\n"');
    lines.push('"Content-Transfer-Encoding: 8bit\\n"');
    lines.push('');

    for (const entry of entries.values()) {
      for (const ref of entry.refs) {
        lines.push(`#: ${ref}`);
      }

      if (entry.context) {
        lines.push(`msgctxt "${escapePoString(entry.context)}"`);
      }

      lines.push(`msgid "${escapePoString(entry.msgid)}"`);
      lines.push(`msgstr "${entry.translation || ''}"`);
      lines.push('');
    }

    return lines.join('\n');
    //#endregion
  }
  //#endregion

  //#region extract po to json
  export function extractPoToJson(poFileContent: string): GettextFile[] {
    //#region @backendFunc
    const entries = parsePoEntries(poFileContent);
    const filesMap = new Map<string, GettextFile>();

    for (const entry of entries) {
      if (!entry.msgid) continue;

      for (const ref of entry.refs) {
        const parsedRef = parsePoRef(ref);
        if (!parsedRef) continue;

        let file = filesMap.get(parsedRef.fileAbsPath);

        if (!file) {
          file = {
            fileAbsPath: parsedRef.fileAbsPath,
            tags: [],
          };
          filesMap.set(parsedRef.fileAbsPath, file);
        }

        file.tags.push({
          lineNumber: parsedRef.lineNumber,
          gettextString: entry.msgid,
          context: entry.msgctxt,
          translation: entry.msgstr || undefined,
        });
      }
    }

    return [...filesMap.values()];
    //#endregion
  }
  //#endregion

  //#region generate translation override interface
  export function generateTranslationOverrideInterface(
    file: GettextFile,
    interfaceName: string,
    locale: UtilsI18n.CommonLocaleCode,
  ): string {
    //#region @backendFunc
    const contexts = new Map<string, string[]>();

    for (const tag of file.tags) {
      const context = tag.context ?? '';

      let arr = contexts.get(context);

      if (!arr) {
        arr = [];
        contexts.set(context, arr);
      }

      if (!arr.includes(tag.gettextString)) {
        arr.push(tag.gettextString);
      }
    }

    const lines: string[] = [];

    lines.push(`export interface ${interfaceName} {`);
    lines.push(`  "${escapeTs(locale)}": {`);

    for (const [context, strings] of contexts) {
      lines.push(`  "${escapeTs(context)}": {`);

      for (const text of strings.sort()) {
        lines.push(`    "${escapeTs(text)}"?: string;`);
      }

      lines.push(`  };`);
      lines.push('');
    }

    lines.push(`  };`);

    lines.push(`}`);

    return lines.join('\n');
    //#endregion
  }

  function escapeTs(value: string): string {
    return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }
  //#endregion

  //#region merge gettext file
  export function mergeGettextFile(
    jsonContent1FromTsHtml: UtilsPoFile.GettextFile,
    json2ContentFromPoFileModifedByUser?: UtilsPoFile.GettextFile | null,
  ): UtilsPoFile.GettextFile {
    //#region @backendFunc
    const oldTagsByKey = new Map<string, UtilsTypescript.GettextExtracted>();

    for (const oldTag of json2ContentFromPoFileModifedByUser?.tags ?? []) {
      oldTagsByKey.set(getGettextTagKey(oldTag), oldTag);
    }

    return {
      fileAbsPath: jsonContent1FromTsHtml.fileAbsPath,
      fileRelativePath: jsonContent1FromTsHtml.fileRelativePath,
      isAppFile: jsonContent1FromTsHtml.isAppFile,
      tags: jsonContent1FromTsHtml.tags.map(sourceTag => {
        const oldTag = oldTagsByKey.get(getGettextTagKey(sourceTag));

        return {
          ...sourceTag,
          lineNumber: sourceTag.lineNumber,
          translation: oldTag?.translation || undefined,
        };
      }),
    };
    //#endregion
  }
  //#endregion

  //#region models & helpers
  function getGettextTagKey(
    tag: Pick<UtilsTypescript.GettextExtracted, 'gettextString' | 'context'>,
  ): string {
    return `${tag.context ?? ''}\u0004${tag.gettextString}`;
  }

  export interface GettextFile {
    fileAbsPath: string;
    fileRelativePath?: string;
    /**
     * taon thing - file can be for app or lib
     */
    isAppFile?: boolean;
    tags: UtilsTypescript.GettextExtracted[];
  }

  interface ParsedPoEntry {
    refs: string[];
    msgctxt?: string;
    msgid?: string;
    msgstr?: string;
  }

  function parsePoEntries(po: string): ParsedPoEntry[] {
    //#region @backendFunc
    const lines = po.split(/\r?\n/);
    const entries: ParsedPoEntry[] = [];

    let current: ParsedPoEntry = { refs: [] };
    let activeField: 'msgctxt' | 'msgid' | 'msgstr' | null = null;

    const flush = () => {
      if (
        current.refs.length ||
        current.msgctxt !== undefined ||
        current.msgid !== undefined ||
        current.msgstr !== undefined
      ) {
        entries.push(current);
      }

      current = { refs: [] };
      activeField = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        flush();
        continue;
      }

      if (trimmed.startsWith('#:')) {
        current.refs.push(...trimmed.slice(2).trim().split(/\s+/));
        activeField = null;
        continue;
      }

      if (trimmed.startsWith('msgctxt')) {
        current.msgctxt = readPoQuoted(trimmed.slice('msgctxt'.length).trim());
        activeField = 'msgctxt';
        continue;
      }

      if (trimmed.startsWith('msgid')) {
        current.msgid = readPoQuoted(trimmed.slice('msgid'.length).trim());
        activeField = 'msgid';
        continue;
      }

      if (trimmed.startsWith('msgstr')) {
        current.msgstr = readPoQuoted(trimmed.slice('msgstr'.length).trim());
        activeField = 'msgstr';
        continue;
      }

      if (trimmed.startsWith('"') && activeField) {
        current[activeField] =
          (current[activeField] ?? '') + readPoQuoted(trimmed);
      }
    }

    flush();

    // skip header
    return entries.filter(entry => !(entry.msgid === '' && !entry.refs.length));
    //#endregion
  }

  function parsePoRef(
    ref: string,
  ): { fileAbsPath: string; lineNumber: number } | null {
    //#region @backendFunc
    const match = ref.match(/^(.+):(\d+)$/);
    if (!match) return null;

    return {
      fileAbsPath: match[1],
      lineNumber: Number(match[2]),
    };
    //#endregion
  }

  function escapePoString(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n');
  }

  function readPoQuoted(value: string): string {
    const match = value.match(/^"([\s\S]*)"$/);
    if (!match) return '';

    return unescapePoString(match[1]);
  }

  function unescapePoString(value: string): string {
    return value
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  //#endregion
}
