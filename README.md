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
`.github/workflows/spec-change.yml` (`spec-change`). Locally:

```sh
openspec validate --all --strict
actionlint
gitleaks git --redact --no-banner --exit-code 1 .
```

## Shared release branch workflow

`tilr-dev/.github/.github/workflows/release-branch.yml@<commit>` orchestrates releases
for gitpm and tilrd. Invoke it on pushes to `release/**`, with job permission `contents: read`.
Keep caller concurrency serialized (`cancel-in-progress: false`). The workflow validates
`release/X.Y` before obtaining a short-lived repository-scoped tilr-bot installation token.
It uses release-please 17.6.0 and the caller's `release-please-config.json` and
`.release-please-manifest.json`; complete caller history and tags select the branch line's
version and shipped changelog baseline. The implementation is checked out separately.

| Input | Default | Meaning |
| --- | --- | --- |
| `workflow-sha` | required | Full 40-character commit of this repository, identical to the `uses` pin |
| `package-path` | `.` | Package key in the caller's release-please config; gitpm uses `crates/gitpm` |
| `app-client-id` | required | `vars.TILR_BOT_CLIENT_ID` from the caller |

Pass `secrets.app-private-key` explicitly from `secrets.TILR_BOT_PRIVATE_KEY`.
The App token has contents, pull request and issues write access only in the calling repository.
No App credentials are passed to build jobs.

| Output | Meaning |
| --- | --- |
| `release_created` | String `true` only for a newly created stable release, otherwise `false` |
| `tag` | Stable tag or candidate tag (`vX.Y.Z-rc.N`), empty when no build should run |
| `version` | `tag` without its leading `v`, or empty |
| `is_rc` | String `true` for a selected candidate, otherwise `false` |

If no stable release is created, the workflow creates a prerelease and tags the pushed commit,
increments the candidate number for subsequent commits, and reuses a candidate on rerun.
A commit already carrying a stable tag produces no candidate. Callers build `outputs.tag`,
attach archives and checksums, and retain signing and publishing. gitpm publishes to crates.io
only when `release_created == 'true'`; tilrd sends candidates to CDN beta and stable releases
to the stable channel. A failed build can leave a prerelease without assets until rerun.

Update `uses` and `workflow-sha` together. Reusable workflows run in the caller's GitHub
context, so `github.workflow_sha` cannot select the shared implementation; the explicit
implementation pin avoids fetching mutable main. Caller CI checks these pins match.
The shared release-line suite runs both root and nested package fixtures:

```sh
npm ci --prefix .github/release-please --ignore-scripts --no-audit --no-fund
npm test --prefix .github/release-please
```
