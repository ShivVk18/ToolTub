#!/bin/sh
# Local guard: run the full suite before every push.
# Install once with:  ln -sf ../../scripts/pre-push.sh .git/hooks/pre-push
set -e
echo "pre-push: running npm run test:all (lint, types, unit, build, e2e)…"
npm run test:all
