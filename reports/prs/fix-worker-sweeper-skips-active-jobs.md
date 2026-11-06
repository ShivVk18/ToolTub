# fix(worker): the sweeper could delete a job's folder while it was still converting

## What and why
PDF to Word failed intermittently under load ("We couldn't convert this PDF…") even after the retry added earlier. The worker's sweeper deletes every job folder whose mtime is older than `RETENTION_MS`; it had no idea which jobs were running. When LibreOffice took longer than the retention time (6 s in the e2e setup; possible in production with a short retention or a slow host), the sweeper removed the folder mid-conversion and the job failed.

## How
- `worker/src/sweep.mjs`: `sweep(dir, retentionMs, active, now)` skips folders of active jobs.
- The worker tracks job ids in an `active` set for the whole conversion (`try/finally`).

## Evidence
- New unit test `tests/unit/worker-sweep.test.ts`: old inactive folder removed, old *active* folder kept, fresh folder kept.
- Full chromium + platform suite twice under load: PDF to Word passed both times (it failed in the previous loaded run). Run 1 had one failure in "queued job … survives a worker restart" — a pre-existing timing race in that test (it posts while the stopped worker's heartbeat is "still fresh for a moment"); run 2 and 3/3 isolated runs of `server-tools.spec.ts` passed. Tracked separately.
- `npm run verify`: exit 0.

## Checklist
- [x] One concern only
- [x] Test for the sweeper rule
- [x] `npm run verify` green
- [x] Worker container still ships `src/` (Dockerfile copies the folder)
