# community-health Specification

## Purpose
Define the default community health files the tilr-dev organization repository provides to every repository of the organization.

## Requirements

### Requirement: Organization-wide defaults
The repository SHALL keep at its root the default `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `PULL_REQUEST_TEMPLATE.md` and the `ISSUE_TEMPLATE/` issue forms, so that GitHub shows them in every tilr-dev repository that has no file of its own with the same name.

#### Scenario: Repository without its own file
- **WHEN** a tilr-dev repository has no `CONTRIBUTING.md` of its own
- **THEN** GitHub links the contributing guide of this repository from that repository's pull requests and issues

#### Scenario: Repository with its own file
- **WHEN** a tilr-dev repository has its own `SECURITY.md`
- **THEN** GitHub shows that repository's file and not the default

### Requirement: Licenses are per repository
The repository MUST NOT be relied on for licenses: each tilr-dev repository SHALL carry its own `LICENSE-*` files, and `README.md` says so.

#### Scenario: Repository without license files
- **WHEN** a tilr-dev repository has no `LICENSE-*` file
- **THEN** it has no license from this repository either

### Requirement: Private vulnerability reports
`SECURITY.md` SHALL ask reporters not to use public issues, pull requests or discussions, and to report through GitHub's private vulnerability reporting in the repository's Security tab; the issue forms' contact links SHALL point security problems to `SECURITY.md`.

#### Scenario: Reporter opens a new issue
- **WHEN** a reporter opens the issue chooser of a tilr-dev repository that uses the default forms
- **THEN** a "Security problem" contact link leads to `SECURITY.md` instead of a public issue

#### Scenario: Supported versions
- **WHEN** a reporter reads `SECURITY.md`
- **THEN** it states that fixes go into the latest release

### Requirement: Issue forms and pull request template
The default issue forms SHALL be a bug report labelled `bug` and an idea or feature labelled `enhancement`, with blank issues allowed; the default pull request template SHALL ask for a Conventional Commit title, what changes and why with the linked issue, and a checklist of local checks, tests and one topic per pull request.

#### Scenario: Bug report
- **WHEN** a user opens a bug report with the default form
- **THEN** the issue gets the `bug` label and requires what happened and steps to reproduce

#### Scenario: Pull request description
- **WHEN** a contributor opens a pull request in a repository without its own template
- **THEN** the description is prefilled with the title hint, "What and why" and the checklist
