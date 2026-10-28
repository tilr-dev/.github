## Why
Release orchestration is duplicated in the release workflows of the organization's repositories, and only one of them tags release candidates. One reusable workflow gives every repository the same release branch scheme.

## What Changes
- Introduce a shared release-branch workflow in tilr-dev/.github that callers invoke at an immutable commit.
- Keep one release-line runner and regression suite, validate release branch names, and expose release/candidate metadata.
- Keep artifact builds, uploads, crates.io publication and CDN publication in their calling repositories.

## Non-goals
- Moving artifact builds, signing, notarization or CDN upload into the shared repository.
- Changing release-line version selection or stable publication policy.

## Impact
Callers: none yet; repositories adopt the workflow by pinning it in their release workflows. This introduces a new workflow contract; no existing shared workflow contract is replaced.
