## ADDED Requirements

### Requirement: CI on pull requests into main
The workflow `.github/workflows/ci.yml` SHALL run on pull requests into `main`, on merge queue groups, on pushes to `main` and on manual dispatch, with read-only repository contents, and report three jobs: `openspec` (`openspec validate --all --strict`), `actionlint` (every workflow under `.github/workflows/`) and `gitleaks` (the whole history, redacted). A failed job fails the check of the same name.

#### Scenario: Invalid specification
- **WHEN** a pull request leaves a spec under `openspec/specs/` without a scenario
- **THEN** the `openspec` check fails

#### Scenario: Broken workflow
- **WHEN** a pull request adds a workflow with an expression or shell error that actionlint reports
- **THEN** the `actionlint` check fails

#### Scenario: Secret in history
- **WHEN** a commit of the pull request contains a token gitleaks recognizes
- **THEN** the `gitleaks` check fails and the log shows the finding redacted

### Requirement: Pinned tools
CI SHALL download its tools at fixed versions and verify them: actionlint and gitleaks release archives against a SHA-256 digest in the workflow, OpenSpec as an exact npm version, and third-party actions by full commit SHA.

#### Scenario: Tampered download
- **WHEN** a downloaded release archive does not match the digest in the workflow
- **THEN** the job fails before running the tool

### Requirement: Specification authorization
The workflow `.github/workflows/spec-change.yml` SHALL run the shared checker `spec_change.py` with component `github` on `pull_request_target` into `main`, loaded from `main`, with the checker and its merge helper downloaded from a fixed gitpm commit and verified against SHA-256 digests in the workflow, without checking out or executing candidate files; its job is named `spec-change`. On a merge queue group it SHALL report success without fetching or running anything.

#### Scenario: Unauthorized edit of a requirement
- **WHEN** a pull request from `task/TILR-<n>` modifies an existing requirement on `main` and the task has no matching spec-change grant by the owner for component `github`
- **THEN** the `spec-change` check fails and lists the uncovered change

#### Scenario: Branch outside the task scheme
- **WHEN** a pull request into `main` comes from a branch not named `task/TILR-<n>`
- **THEN** the `spec-change` check fails

#### Scenario: Merge queue
- **WHEN** a pull request that passed `spec-change` enters the merge queue
- **THEN** the group's `spec-change` check passes without downloading the checker
