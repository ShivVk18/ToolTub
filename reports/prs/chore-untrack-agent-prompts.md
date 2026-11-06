# chore: keep agent prompt docs out of git

## What and why
The owner asked not to commit the prompt markdown files. `docs/agent/*.md` (start here, UI fix prompt, tools E2E prompt, engineering standards, redesign spec) are working instructions for the agent, not product docs.

## How
- `git rm --cached docs/agent` (files stay on disk) and ignore `docs/agent/`.

## Checklist
- [x] One concern only
- [x] No code change
