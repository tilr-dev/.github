## MODIFIED Requirements

### Requirement: CI on pull requests into main
The workflow `.github/workflows/ci.yml` SHALL run on pull requests into `main`, on merge queue groups, on pushes to `main` and on manual dispatch, with read-only repository contents, and report three jobs: `openspec` (`openspec validate --all --strict`), `actionlint` (every workflow under `.github/workflows/`) and `gitleaks` (the history of the commit under check, redacted). A failed job fails the check of the same name.

#### Scenario: Invalid specification
- **WHEN** a pull request leaves a spec under `openspec/specs/` without a scenario
- **THEN** the `openspec` check fails

#### Scenario: Broken workflow
- **WHEN** a pull request adds a workflow with an expression or shell error that actionlint reports
- **THEN** the `actionlint` check fails

#### Scenario: Secret in history
- **WHEN** a commit of the pull request contains a token gitleaks recognizes
- **THEN** the `gitleaks` check fails and the log shows the finding redacted

## ADDED Requirements

### Requirement: CI scans secrets in the checked commit's history only
The `gitleaks` CI check SHALL scan every commit reachable from the checked-out
HEAD, with redacted findings, and SHALL exclude commits reachable only from other
fetched branches. It MUST retain full checkout history and use
`gitleaks git --log-opts=HEAD` for push, pull request and merge queue events.

#### Scenario: Unrelated branch contains a secret
- **WHEN** a push, pull request or merge queue check has a clean HEAD history and a fetched unrelated branch contains a recognized secret
- **THEN** the `gitleaks` check passes without reporting that unrelated secret

#### Scenario: Secret removed from the checked tree
- **WHEN** a recognized secret exists in an ancestor of HEAD but has been removed from the checked tree
- **THEN** the `gitleaks` check fails with a redacted finding

#### Scenario: Checked merge introduces a secret
- **WHEN** the checked pull request or merge queue merge commit includes a parent containing a recognized secret
- **THEN** the `gitleaks` check fails with a redacted finding
