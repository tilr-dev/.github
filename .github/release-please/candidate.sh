#!/usr/bin/env bash
set -euo pipefail
if ! [[ $BRANCH =~ ^release/(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]]; then
  echo "::error::release branches are named release/X.Y, not $BRANCH"
  exit 1
fi
LINE=${BRANCH#release/}
line=$LINE
# Tags of this line, as "<tag> <commit>" (lightweight tags point at the commit).
tags=$(gh api "repos/$GH_REPO/git/matching-refs/tags/v$line." --paginate \
  --jq '.[] | "\(.ref | ltrimstr("refs/tags/")) \(.object.sha)"')
# A commit that already carries a release (a re-run after a failed build or upload)
# gets no candidate: release-please no longer reports that release as created.
released=$(awk -v line="v$line." -v sha="$SHA" '
  index($1, line) == 1 && substr($1, length(line) + 1) ~ /^[0-9]+$/ && $2 == sha {
    print $1; exit
  }' <<<"$tags")
if [ -n "$released" ]; then
  echo "::notice::$SHA is release $released; no release candidate"
  exit 0
fi
# A re-run on a commit that already has a candidate of this line reuses it, even if a
# release came out since.
tag=$(awk -v line="v$line." -v sha="$SHA" '
  index($1, line) == 1 && substr($1, length(line) + 1) ~ /^[0-9]+-rc\.[0-9]+$/ && $2 == sha {
    print $1; exit
  }' <<<"$tags")
if [ -n "$tag" ]; then
  echo "tag_name=$tag" >> "$GITHUB_OUTPUT"
  exit 0
fi
patch=$(awk -v line="v$line." '
  index($1, line) == 1 && substr($1, length(line) + 1) ~ /^[0-9]+$/ {
    p = substr($1, length(line) + 1) + 1; if (p > next_patch) next_patch = p
  }
  END { print next_patch + 0 }' <<<"$tags")
version="$line.$patch"
rc=$(awk -v prefix="v$version-rc." '
  index($1, prefix) == 1 && substr($1, length(prefix) + 1) ~ /^[0-9]+$/ {
    n = substr($1, length(prefix) + 1) + 0; if (n > max) max = n
  }
  END { print max + 1 }' <<<"$tags")
tag="v$version-rc.$rc"
gh release create "$tag" --prerelease --target "$SHA" --title "$tag" \
  --notes "Release candidate $tag from $BRANCH at $SHA."
echo "tag_name=$tag" >> "$GITHUB_OUTPUT"
