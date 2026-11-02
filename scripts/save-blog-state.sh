#!/usr/bin/env bash
set -euo pipefail
# Persist generated article state on a separate branch; never add secret files.
if ! compgen -G 'agent/output/*.json' > /dev/null; then
  echo 'No article state to save.'
  exit 0
fi
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
# Use a separate empty index so the state branch contains no application source.
state_index=$(mktemp "${RUNNER_TEMP:-/tmp}/blog-state-index.XXXXXX")
rm -- "$state_index"
export GIT_INDEX_FILE="$state_index"
trap 'rm -f -- "$state_index"' EXIT
git read-tree --empty
git add -f -- agent/output/*.json
git add -- blog
state_tree=$(git write-tree)
set +e
git ls-remote --exit-code origin refs/heads/blog-state > "${RUNNER_TEMP:-/tmp}/blog-state-save-ref"
status=$?
set -e
if [ "$status" -eq 0 ]; then
  git fetch --no-tags origin refs/heads/blog-state
  previous=$(git rev-parse FETCH_HEAD)
  if [ "$(git rev-parse "$previous^{tree}")" = "$state_tree" ]; then
    echo 'Article history already saved.'
    exit 0
  fi
  state_commit=$(git commit-tree "$state_tree" -p "$previous" -m 'Save generated blog history')
elif [ "$status" -eq 2 ]; then
  state_commit=$(git commit-tree "$state_tree" -m 'Initialize generated blog history')
else
  echo 'Cannot read state branch; refusing to overwrite history.' >&2
  exit "$status"
fi
# Normal fast-forward push; competing writers fail rather than overwrite state.
git push origin "$state_commit:refs/heads/blog-state"
