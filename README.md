# tilr-dev/.github

Default community health files for every repository in the
[tilr-dev](https://github.com/tilr-dev) organization: [CONTRIBUTING.md](CONTRIBUTING.md),
[SECURITY.md](SECURITY.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md), the pull request template and
the issue forms. GitHub shows them in any repository that has no file of its own with the same
name. Licenses are not inherited: each repository has its own `LICENSE-*` files.

It is also the home of the reusable GitHub Actions workflows the other tilr-dev repositories
call (`tilr-dev/.github/.github/workflows/<file>@<ref>`).

## Specification and checks

What this repository provides is specified in [openspec/specs/](openspec/specs/). A pull request
into `main` passes `.github/workflows/ci.yml` (`openspec`, `actionlint`, `gitleaks`) and
`.github/workflows/spec-change.yml` (`spec-change`). On pushes, pull requests and merge
queue groups, gitleaks scans HEAD and all its ancestors, excluding unrelated fetched
branches. Locally:

```sh
openspec validate --all --strict
actionlint
gitleaks git --redact --no-banner --exit-code 1 --log-opts=HEAD .
python3 scripts/test_gitleaks_workflow.py
```

## Shared release branch workflow

`tilr-dev/.github/.github/workflows/release-branch.yml@<commit>` selects a release tag
and creates its GitHub Release. Call it on branch pushes to `release/**` and tag pushes
matching `v*` with `v*-rc.*` excluded. Only `release/X.Y` and stable `vX.Y.Z` refs are accepted (numeric components,
no leading zeroes). The caller job needs `contents: read`.

```yaml
on:
  push:
    branches: ['release/**']
    tags: ['v*', '!v*-rc.*']

jobs:
  release:
    uses: tilr-dev/.github/.github/workflows/release-branch.yml@<40-character-commit>
    permissions:
      contents: read
    with:
      workflow-sha: <same-40-character-commit>
      app-client-id: ${{ vars.TILR_BOT_CLIENT_ID }}
    secrets:
      app-private-key: ${{ secrets.TILR_BOT_PRIVATE_KEY }}
```

The caller trigger must exclude `vX.Y.Z-rc.N` tags. CI creates them with the tilr-bot
App token, so including them would re-enter the workflow and fail stable-tag validation.

| Input | Meaning |
| --- | --- |
| `workflow-sha` | Required full 40-character commit of this repository, identical to the `uses` pin |
| `app-client-id` | Required tilr-bot GitHub App client ID from the caller |

Pass `secrets.app-private-key` explicitly. Install tilr-bot in the calling repository with
**Contents: read and write** permission; no pull request or issues permission is required.
The workflow mints a repository-scoped token and disables persisted checkout credentials.
App credentials stay in the release job. The caller's normal build/publication permissions
are configured separately.

| Output | Meaning |
| --- | --- |
| `tag` | Stable `vX.Y.Z` or candidate `vX.Y.Z-rc.N`; empty when no build should run |
| `version` | `tag` without its leading `v`, or empty |
| `is_rc` | String `true` for a candidate, otherwise `false` |

A branch push selects one patch above the highest stable tag on that line, or patch zero
when there are no stable tags. Candidate numbers start at one and increase numerically.
A rerun reuses the commit's candidate even if a newer stable tag now exists. A branch
commit already carrying a stable tag on its line produces empty tag/version and no
candidate. Lightweight and annotated tags are supported. Missing prereleases are created
on rerun; existing releases are reused.

A stable tag push must point at a commit contained in the matching `release/X.Y` branch.
Missing branches, a different line or unrelated history fail before any tag or release
mutation. Stable releases use GitHub-generated notes starting at the highest previous
stable tag on the line, or the highest previous stable tag overall if the line has none.
The current tag and higher versions are excluded from that baseline. The first release
omits the notes start tag. Stable tags are created by an admin; CI creates RC tags with
tilr-bot. Configure repository release-tag rulesets accordingly after adoption.

The reusable job serializes release selection and creation for the caller repository
with `cancel-in-progress: false` and `queue: max` (up to 100 pending jobs). Keep any
caller release concurrency serialized with `queue: max` too,
using a different group from the reusable job. Callers build nonempty `outputs.tag`,
attach archives and checksums, and retain signing and publication. Gate stable-only
publication on a nonempty tag and `is_rc == 'false'`. A failed build can leave a release
without assets until rerun. Publication steps should support reruns.

Update `uses` and `workflow-sha` together. Reusable workflows run in the caller's GitHub
context, so the explicit implementation pin selects the separate shared checkout; full
caller history, branches and tags supply release metadata. This contract replaces the
old package-path/config/manifest and release_created contract. The desktop-mac, tilrd
and gitpm callers adopt the new pin and contract separately.

Run the dependency-free integration suite (Node.js and Git required):

```sh
node --test .github/release/*.test.cjs
```
