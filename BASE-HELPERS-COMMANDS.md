# Git

## Handy shortcuts

`taon soft`  => `git reset --soft HEAD~1`

`taon count:commits`  => show origin of project

`taon remove:submodules`  => remove all submodules from repo

`taon remove:submodule my-not-wanted-git-submodules`  => remove submodule by folder name

`taon remove:tag git-tag-name-optionally` => remove git tag (if not provided name - select menu appears)

`taon last:tag` => display info aboutlast tag

## Remotes

`taon origin`  => show origin of project

`taon remote`  => `taon origin` 

`taon origins`  => show all origins of project

`taon remotes`  => `taon origins`

`taon rename:origin http://my-new-origin`  => replaces default origin new provided

`taon set:origin http://my-new-origin`  => alias to rename:origin

`taon set:remote:ssh`  => changes http remote to ssh remote

`taon set:remote:http`  => changes ssh remote to https remote

## Rebase 

`taon rebase`  => rebase current branch with default branch

`taon rebase branch-to-rebase`  => rebase current branch with changes from branch-to-rebase

## Stash

`taon stash`  => stash only staged files

`taon stashall`  => stash all files

## Reset + change branch

`taon branch`  => git fetch / display menu with branches to select / select branch

`taon reset`  => `git fetch` + remove tmp files for project + `taon branch` (include children)

`taon reset my-branch`  => same as `taon reset` but specific branch

`taon reset`  => reset hard and pull (recrusively)

## Pull

`taon pull`  => pull current branch or current workspace projects one after another

`taon repull`  => `git reset hard --HEAD~10` + `taon pull`


## Push

`taon pushall` => push code to all remotes(origins) defined in .git/config

`taon pall` => `taon pushall`

`taon push`  => (optionally git add +)  commit with message based on branch name + push current branch

## Smart Conventional Commits Branching

**Checkout branch + add changes + commit message + push branch**

Create special branches (with metadata inside name) that can be use later with command
`taon push`<br> to "re-push" changes and use matadata from branch name 
 as commit message.

### fix
Quick commit and push bugfix<br>
`taon pfix JIRA-379089 JIRA-380320 proper counter message [my-lib]` <br> 
<=><br>
`git checkout -b bugfix/JIRA-379089-JIRA-380320--my-lib--proper-counter-message` + <br>
`git add` + <br>
`git commit -m "fix(my-lib): proper counter message JIRA-379089 JIRA-380320"` + <br>
`git push origin bugfix/JIRA-379089-JIRA-380320--my-lib--proper-counter-message`

taon pfix <=> taon pushfix <=> taon push:fix

### feature
Quick commit and push feature<br>
`taon pf JIRA-379089 JIRA-380320 admin notification [my-lib]`  <br>
<>=><br>
`git checkout -b feature/JIRA-379089-JIRA-380320--my-lib--admin-notification` + <br>
`git add` + <br>
`git commit -m "feat(my-lib): admin notification JIRA-379089 JIRA-380320"` + <br>
`git push origin feature/JIRA-379089-JIRA-380320--my-lib--admin-notification`

taon pf <=> taon pushfeature <=> taon push:feature

### chore
Quick commit and push chore <br>
`taon pc JIRA-379089 update deps`  
<=>  <br>
`git checkout -b chore/JIRA-379089-update-deps` + <br>
`git add` + <br>
`git commit -m "chore: update deps JIRA-379089"` + <br>
`git push origin  chore/JIRA-379089-update-deps`

taon pc <=> taon chore <=> taon pchore

### docs
Quick commit and push docs update <br>
`taon pd explained installation`<br>
 <=> <br>
`git checkout -b docs/explained-installation` + <br>
`git add` + <br>
`git commit -m "docs:explained installation"` + <br>
`git push origin docs/explained-installation`

taon pd <=> taon pdocs

### test
Quick commit and push tests update <br>
`taon ptest admin permission new use case`<br>
 <=> <br>
`git checkout -b test/admin-permission-new-use-case` + <br>
`git add` + <br>
`git commit -m "test: admin permission new use case"` + <br>
`git push origin test/admin-permission-new-use-case`

taon push:test <=> taon ptest  <=> taon ptests

### styl

Quick commit and push style update (formatting, linting etc.) <br>
`taon pstyle proper project methods`<br>
 <=> <br>
`git checkout -b style/proper-project-methods` + <br>
`git add` + <br>
`git commit -m "style: proper project methods"` + <br>
`git push origin style/proper-project-methods`

taon pstyl <=> taon pstyle

### refactor

Quick commit and push code refactor <br>
`taon pref new permission module`<br>
 <=> <br>
`git checkout -b refactor/new-permission-module` + <br>
`git add` + <br>
`git commit -m "refactor: new permission module"` + <br>
`git push origin refactor/new-permission-module`


taon pref <=> taon prefactor

### release

Quick commit and push release commit <br>
`taon prelease`<br>
 <=> <br>
`git checkout -b release/version-v1-2-3` + <br>
`git add` + <br>
`git commit -m "release: version v1.2.3"` + <br>
`git push origin release/version-1-2-3`

taon prel <=> taon prelase


# Other commands

`taon hosts`  => open hosts files in VSCode

`taon refresh` => refresh linked projects configuration
(after deleting or adding new repo)

`taon settings:vscode` => set random nice colors for you vscode window
