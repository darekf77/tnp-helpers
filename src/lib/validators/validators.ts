import { ValidatorsGit } from "./validators-git";
import { ValidatorsNetwork } from "./validators-network";

export namespace Validators {
  export import git = ValidatorsGit;
  export import network = ValidatorsNetwork;
}

