## What and why

<!-- The problem and its root cause, in one paragraph. -->

## How

<!-- The change, in a few bullets. -->

## Evidence

- Failing test before: <!-- test name, or N/A with reason -->
- After: <!-- tests / visual diff / screenshots -->

## Checklist

- [ ] One concern only
- [ ] Failing test written first (or N/A for refactor/docs, with reason)
- [ ] `npm run verify` green
- [ ] No new dependency > 100 KB, no server/infra change (or approved)
- [ ] Layering and single-registry rules respected
- [ ] Light + dark and mobile checked (UI changes)
- [ ] Docs / ADR updated if a decision changed
