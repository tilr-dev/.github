## Why

Release branches already identify the release line. Requiring conventional commits and release PRs prevents releases for repositories that do not use that commit convention. An explicit stable tag should publish the stable release.

## What Changes

- Replace release-please with branch-driven candidates and tag-driven stable releases.
- Validate stable tag ancestry before publication and generate GitHub release notes.
- **BREAKING**: expose only tag, version and is_rc; remove package-path and release_created. The desktop-mac, tilrd and gitpm callers adopt the new pin and contract separately.
- Document bot permissions and add integration coverage.

## Impact

- Shared release workflow, implementation scripts, tests and caller documentation.
- Consumers adopt the new immutable workflow commit separately.

## Out of scope

- Caller repository migrations, artifact publication and release-tag ruleset setup.
