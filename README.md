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
