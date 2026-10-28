## ADDED Requirements

### Requirement: Shared release branch orchestration
`tilr-dev/.github/.github/workflows/release-branch.yml` SHALL perform release-line version selection and release candidate tagging for the release workflow that calls it. Callers pin the workflow to an immutable commit and retain artifact builds and publication in their own repositories.

#### Scenario: A release branch is pushed
- **WHEN** a push to `release/X.Y` creates no stable release
- **THEN** release-please opens or updates its PR targeting the pushed branch using the tilr-bot token
- **AND** the pushed commit receives `vX.Y.Z-rc.N`, with the next stable patch of the line and the next candidate number
- **AND** the caller builds the candidate and publishes a GitHub prerelease with the same target archives and checksums as a stable release

#### Scenario: Another push and a rerun
- **WHEN** another commit is pushed on the same release line
- **THEN** it receives the next candidate number
- **AND** rerunning a commit already tagged as a candidate reuses its tag

#### Scenario: A stable release is created
- **WHEN** the release PR is merged and release-please creates a stable release
- **THEN** no candidate is tagged and the caller retains its stable publication behavior

#### Scenario: Invalid branch
- **WHEN** a branch named `release/next` invokes the workflow
- **THEN** it fails with `release branches are named release/X.Y` before opening a PR, tagging or building

#### Scenario: A stable commit is rerun
- **WHEN** the pushed commit already has a stable tag on its line
- **THEN** no new candidate or candidate build is produced

### Requirement: Release workflow contract
The reusable workflow SHALL accept a package path and an immutable implementation SHA, use the caller’s conventional release-please configuration and manifest paths, require a bot token as a secret, and expose `release_created`, `tag`, `version` and `is_rc` as string outputs. Empty tag and version SHALL indicate there is nothing to build. The shared implementation SHALL carry a single release-line regression suite covering both root and nested package paths.

#### Scenario: Caller consumes metadata
- **WHEN** the workflow creates a stable release or selects a candidate
- **THEN** tag and version identify that exact release, release_created is true only for a newly created stable release, and is_rc is true only for a candidate
- **AND** the caller builds the returned tag using its own jobs

#### Scenario: Shared implementation is fetched
- **WHEN** a caller invokes the workflow at a fixed commit
- **THEN** the runner and candidate implementation are fetched from that same workflow commit, separately from the calling repository checkout
