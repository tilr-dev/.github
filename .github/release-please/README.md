# Release-line runner

This is the single release-please 17.6.0 runner and test suite for repositories that call the shared release branch workflow.
Run `run.cjs` with the caller checkout as working directory and `GH_TOKEN`,
`GITHUB_REPOSITORY`, `BRANCH`, `PACKAGE_PATH` and `GITHUB_OUTPUT` set by the reusable
workflow. Dependencies are resolved beside this script, never from the caller checkout.
`candidate.sh` preserves candidate selection and publishes the prerelease through `gh`.

Tests use local Git histories and stub GitHub APIs/CLI. `npm test` runs both package shapes;
fixtures preserve the caller configs while replacing bootstrap SHAs with local commits.
See the repository README for the reusable workflow contract and caller responsibilities.
