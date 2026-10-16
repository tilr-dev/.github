# Contributing to Tilr

Thanks for wanting to help. Bug fixes, small improvements, docs, new plugins: all welcome, and
you do not need to ask before opening a pull request.

## How to contribute

- **A small fix** (a bug, a typo, a missing check): open a pull request straight away.
- **A bigger change** (a new feature, a change to the plugin API, a new dependency): open an issue
  first and describe what you want to do. It saves you work if the direction needs adjusting.
- **A security problem:** do not open an issue. See [SECURITY.md](SECURITY.md).

## Before you open a pull request

```sh
npm install
npm run verify        # format, lint, types, tests, duplicates, unused code, secrets, audit
```

`npm run verify` is the same check CI runs. If it is green locally, CI will be green too. The git
hooks installed by `npm install` run the quick part of it on every commit.

- **One topic per pull request.** Two unrelated fixes are two pull requests.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org):
  `fix: …`, `feat: …`, `docs: …`, `refactor: …`, `test: …`, `chore: …`. Add `!` for a breaking
  change (`feat!: …`). Pull requests are squash-merged, so the pull request title is what lands in
  the history and the changelog: write it the same way.
- **Tests:** a fix comes with a test that fails without it; a feature comes with tests for it.
- Reference the issue in the description: `Closes #123`.

## Code written with AI tools

Welcome. It is held to the same bar as any other code: `npm run verify` passes, the change is one
topic, and you understand and stand behind what you send. Please read your diff before opening the
pull request.

## What happens next

1. **CI waits for approval.** Workflows on pull requests from new contributors start only after a
   maintainer approves the run. This protects the project's CI, not a sign of distrust; it is
   usually quick.
2. **Review.** You get feedback on the pull request. Small requests ("rename this", "add a test
   for that") are normal; push to the same branch and the pull request updates.
3. **Merge.** A maintainer squash-merges it. Your change goes out with the next release and is
   listed in the changelog.

## Licensing

There is nothing to sign. By opening a pull request you agree that your contribution is licensed
under the repository's license (MIT OR Apache-2.0, see the `LICENSE-*` files in each repository).

## Conduct

Be kind and assume good intent. This project follows the [Code of Conduct](CODE_OF_CONDUCT.md).
