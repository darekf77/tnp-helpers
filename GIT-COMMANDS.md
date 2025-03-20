# Git

## Handy shortcuts

`taon soft`  => `git reset --soft HEAD~1`

`taon hosts`  => open hosts files in VSCode

`taon count:commits`  => show origin of project

`taon remove:submodules my-not-wanted-git-submodules`  => remove unwanted git submodules

## Remotes

`taon origin`  => show origin of project

`taon remote`  => `taon origin` 

`taon origins`  => show all origins of project

`taon remotes`  => `taon origins`

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

## Checkout branch + add changes + commit message + push branch

Create special branches (with metadata) that can be use later with command
`taon push`<br> to "re-push" changes and use matadata from branch name 
 as commit message.

### fix
Quick commit and push bugfix<br>
`taon pfix JIRA-379089 JIRA-380320 proper counter message [my-lib]` <br> 
<=><br>
`git checkout -b fix/JIRA-379089-JIRA-380320-proper-counter-message` + <br>
`git add` + <br>
`git commit -m "fix(my-lib): proper counter message JIRA-379089 JIRA-380320"` + <br>
`git push origin fix/JIRA-379089-JIRA-380320-proper-counter-message`

taon pfix <=> taon pushfix <=> taon push:fix

### feature
Quick commit and push feature<br>
`taon pf JIRA-379089 JIRA-380320 admin notificaiton [my-lib]`  <br>
<>=><br>
`git checkout -b feature/JIRA-379089-JIRA-380320-proper-counter-message` + <br>
`git add` + <br>
`git commit -m "feat(my-lib): admin notificaiton JIRA-379089 JIRA-380320"` + <br>
`git push origin feature/JIRA-379089-JIRA-380320-proper-counter-message`

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
`taon pt <args>`<br>
`taon ptest <args>`<br>

### styl
`taon ps <args>` <br>
`taon pstyl <args>` v

### refactor
`taon pref <args>`<br>
`taon prefactor <args>`<br>

### release
`taon prelease <args>`<br>
