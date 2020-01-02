export class HelpersStringsRegexes {

  removeSlashAtEnd(s: string) {
    s = s.endsWith(`/`) ? s.slice(0, s.length - 1) : s;
    return s;
  }

  escapeStringForRegEx(s: string) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  }


}
