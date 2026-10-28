## Why

tilr-dev/.github becomes a component of the development workflow so that the reusable workflows planned for it (release-please and release candidates, owner's decision 2026-10-27) go through the same review, CI and specification checks as code (owner's decision 2026-10-28). The repository had no OpenSpec baseline and no CI: its contract lived only in README.md and the community health files.

## What Changes

- Establish an OpenSpec baseline of what the repository already provides: the organization-wide community health files.
- Add CI on pull requests into `main` (OpenSpec validation, actionlint, gitleaks) and the trusted `spec-change` workflow, and specify them.
- Out of scope: reusable workflows (added by the change that introduces the first one), repository settings and rulesets on GitHub, changes to the wording of the community health files.

## Capabilities

### New Capabilities
- `community-health`: default contributing guide, security policy, code of conduct, issue forms and pull request template for every tilr-dev repository.
- `repository-checks`: the checks a pull request into `main` passes (CI jobs and specification authorization).

### Modified Capabilities
None.

## Impact

`openspec/`, `.github/workflows/ci.yml`, `.github/workflows/spec-change.yml`, README.md. The community health files themselves are unchanged, so no other repository sees a difference.
