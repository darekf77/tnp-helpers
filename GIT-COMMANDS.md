# Taon git commands

`taon reset `  => reset project to default branch

`taon rebase`  => rebase current branch with default branch

`taon rebase branch-rebase-from ` => rebase current branch with provided in arg

`taon pull`  => pull current branch or current workspace projects one after another

`taon push`  => git add + commit with message based on branch name + push current branch

`taon push:fix TEAM6# JIRA-379089 JIRA-380320 proper counter message`  
=> git add + git commit bugfix/JIRA-379089-JIRA-380320-proper-counter-message

aliases
`taon pfix <=> taon pushfix <=> taon push:fix`

`taon push:feature TEAM6#JIRA-379089 admin notificaiton`
=> git add + git commit feature/JIRA-379089-JIRA-380320-admin-notification

`taon pf TEAM6# JIRA-379089 notyfikacje admin` 
=> wypushowanie feature-a 

