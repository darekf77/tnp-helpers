# Git

## Handy shortcuts

`taon soft`  => quivalent: git reset --soft HEAD~1

`taon hosts`  => open hosts files

`taon count:commits`  => show origin of project

`taon remove:submodules my-not-wanted-git-submodules`  => remove unwanted git submodules

## Remotes

`taon origin`  => show origin of project

`taon remote`  => - || -

`taon origins`  => show all origins of project

`taon remotes`  => - || -

## Rebase 

`taon rebase`  => rebase current branch with default branch

`taon rebase branch-to-rebase`  => rebase current branch with changes from branch-to-rebase

## Stash

`taon stash`  => stash only staged files

`taon stashall`  => stash all files

## Reset + change branch

`taon branch`  => git fetch / display menu with branches to select / select branch

`taon reset`  => remove tmp files for project + `taon branch` (include children)

`taon reset my-branch`  => same as `taon reset` but specific branch

`taon reset`  => reset hard and pull (recrusively)

## Pull

`taon pull`  => pull current branch or current workspace projects one after another

`taon repull`  => deep reset hard and pull


## Push

`taon pushall` => push code to all remotes(origins) defined in .git/config

`taon pall` => - || -

`taon push`  => git add + commit with message based on branch name + push current branch

`taon pfix TEAM6# JIRA-379089 JIRA-380320 proper counter message`  
=> git add + git commit bugfix/JIRA-379089-JIRA-380320-proper-counter-message

`taon pfix <=> taon pushfix <=> taon push:fix`

`taon push:feature TEAM6#JIRA-379089 admin notificaiton`
=> git add + git commit feature/JIRA-379089-JIRA-380320-admin-notification

`taon pf TEAM6# JIRA-379089 notyfikacje admin` 
=> wypushowanie feature-a 

`taon pf <=> taon pushfeature <=> taon push:feature`

`taon pdocs <...>` => push quickly documentation

`taon ptest <...>` => push quickly test update

`taon pstyl <...>` => push quickly styles update

`taon pref <...>` => push quickly refactor
