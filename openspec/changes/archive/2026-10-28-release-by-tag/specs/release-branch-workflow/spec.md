## MODIFIED Requirements

### Requirement: Shared release branch orchestration
`tilr-dev/.github/.github/workflows/release-branch.yml` SHALL select release metadata and publish GitHub releases for the calling repository. Callers pin the workflow to an immutable commit and retain artifact builds and publication in their own repositories.

#### Scenario: A release branch is pushed
- **WHEN** a push to `release/X.Y` invokes the workflow
- **THEN** the pushed commit receives `vX.Y.Z-rc.N`, where Z is one more than the highest stable patch on the line, or zero when the line has no stable tags
- **AND** N is one more than the highest candidate number for that version, starting at one
- **AND** a GitHub prerelease is created without a release PR

#### Scenario: Another push and a rerun
- **WHEN** another commit is pushed on the same release line
- **THEN** it receives the next candidate number
- **AND** rerunning a commit already tagged as a candidate reuses its tag and existing prerelease

#### Scenario: A stable release is created
- **WHEN** a push of `vX.Y.Z` invokes the workflow and its commit is an ancestor of `release/X.Y`
- **THEN** a non-prerelease GitHub Release is created with automatically generated notes
- **AND** the notes start from the highest previous stable tag on that line, falling back to the highest previous stable tag overall when the line has none
- **AND** rerunning reuses the existing release

#### Scenario: Invalid branch
- **WHEN** a branch named `release/next` invokes the workflow
- **THEN** it fails with `release branches are named release/X.Y` before tagging or publishing

#### Scenario: Invalid stable tag
- **WHEN** the tag is not exactly `vX.Y.Z`, the matching release branch does not exist, or the tagged commit is not an ancestor of that branch
- **THEN** the workflow fails before any tag or release mutation

#### Scenario: A stable commit is rerun
- **WHEN** the pushed branch commit already has a stable tag on its line, including an annotated tag
- **THEN** no new candidate or candidate build is produced

### Requirement: Release workflow contract
The reusable workflow SHALL accept an immutable implementation SHA, require a bot token as a secret, and expose `tag`, `version` and `is_rc` as string outputs. Empty tag and version SHALL indicate there is nothing to build. The shared implementation SHALL carry an integration suite using local Git repositories and a controlled GitHub CLI substitute.

#### Scenario: Caller consumes metadata
- **WHEN** the workflow publishes a stable release or selects a candidate
- **THEN** tag and version identify that exact release and is_rc is true only for a candidate
- **AND** the caller builds the returned tag using its own jobs

#### Scenario: Shared implementation is fetched
- **WHEN** a caller invokes the workflow at a fixed commit
- **THEN** the implementation is fetched from that same workflow commit, separately from the calling repository checkout
