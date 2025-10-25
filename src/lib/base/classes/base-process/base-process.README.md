# Base process

WORKER => 1 node exec() => a way to validate processes

## Purpose
- worker for starting commands
- workerId should be unique for the whole OS


## BaseProcessWorker
- in destination app (ex. tnp/deployments) should be stored in the Map with unique key


# Usage

```ts
const exampleCommandToExecute = `docker compose up`;
const cwdForCommand = `docker compose up`;
const uniqueProcessId = BaseProcessWorker.forCommand( exampleCommandToExecute, cwdForCommand,{
   whenDone: ({stdout , stderr}) => stdout.includes('Done. Watching..') || stdout.includes('Done. Watching..'),
   whenFail: ({output}) => output.includes('ERROR')
});

deployments.processId = uniqueProcessId;
await this.deploymentsRepository.save(deployments);

// @LAST


```
