# fix(worker): the sweeper deleted uploads of jobs still waiting in the queue

**Severity: High** (server tool loses the file and the job fails). Found while investigating the Phase 4 baseline failure of `server-tools › queued job shows its position and survives a worker restart`, where the job ended "failed" after the worker restarted.

**Bug, proven.** The sweeper spared only the job converting in this worker (`active`). A job still waiting in the queue (waiting, delayed, retrying) whose folder was older than the retention time was deleted, so when the worker reached it the upload was gone and the job failed. In production (1 h retention) that happens to any job that waits over an hour, for example during a worker outage. The new unit test fails without the fix.

**Fix.**
- `keepIds(active, getJobs)` in `worker/src/sweep.mjs` returns the ids to keep: the ones converting plus every job in `waiting / active / delayed / prioritized / waiting-children`.
- The worker reads the queue (`new Queue("convert")`) before each sweep.
- If the queue can't be read (Valkey down), that sweep is skipped rather than guessing.

**Tests.**
- Unit, `worker-sweep.test.ts`: a queued folder older than the retention is kept while a finished one is deleted, and when the queue can't be read nothing is deleted. Both failed before the fix and pass after.
- e2e, `server-tools.spec`: the restart test now keeps the worker down past the retention time (6 s) before restarting, and its assertion prints the job's error if it fails. All 8 pass.

**Not confirmed.** I couldn't show this was the cause of the baseline failure. With the old worker the e2e test still passes, because the restarted worker starts consuming the queue before its first sweep reads the folders, so the job is usually "active" by then. The baseline run didn't record the job's error; the test now prints it, so a repeat can be diagnosed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
