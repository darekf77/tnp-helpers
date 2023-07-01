
export namespace ValidatorsGit {

  export function isValidRepoUrl(url: string) {
    const regex = /^([A-Za-z0-9]+@|http(|s)\:\/\/)([A-Za-z0-9.]+(:\d+)?)(?::|\/)([\d\/\w.-]+?)(\.git)?$/;
    const res = regex.test(url);
    return res;
  }

}
