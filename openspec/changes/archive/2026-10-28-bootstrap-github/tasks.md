## 1. Baseline
- [x] 1.1 Inventory README.md, the community health files and the issue forms; record them as `community-health` requirements without changing behavior (verified by reading each file against its requirement).
- [x] 1.2 Add `openspec/config.yaml` with the repository context and rules.

## 2. Checks
- [x] 2.1 Add `.github/workflows/ci.yml` with the `openspec`, `actionlint` and `gitleaks` jobs (verified by `actionlint` and by running the same commands locally).
- [x] 2.2 Add `.github/workflows/spec-change.yml` with the checker pinned to a gitpm commit and its digests (verified by `actionlint` and `sha256sum --check` of the pinned files).
- [x] 2.3 Specify both in `repository-checks`; run `openspec validate --all --strict`.
