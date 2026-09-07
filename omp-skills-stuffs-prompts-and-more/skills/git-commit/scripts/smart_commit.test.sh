#!/bin/bash

set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
script="$script_dir/smart_commit.sh"
repo=$(mktemp -d)
trap 'rm -rf "$repo"' EXIT

fail() {
    echo "test failed: $1" >&2
    exit 1
}

assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="$3"
    [ "$actual" = "$expected" ] || fail "$message: expected '$expected', got '$actual'"
}

assert_contains() {
    local needle="$1"
    local haystack="$2"
    local message="$3"
    case "$haystack" in
        *"$needle"*) ;;
        *) fail "$message: expected '$needle'" ;;
    esac
}

assert_not_contains() {
    local needle="$1"
    local haystack="$2"
    local message="$3"
    case "$haystack" in
        *"$needle"*) fail "$message: unexpected '$needle'" ;;
        *) ;;
    esac
}

git -C "$repo" init -q
git -C "$repo" config user.name "test user"
git -C "$repo" config user.email "test@example.com"
printf 'original\n' > "$repo/requested.txt"
printf 'original\n' > "$repo/unrelated.txt"
printf 'line %s\n' {1..20} > "$repo/mixed.txt"
git -C "$repo" add requested.txt unrelated.txt mixed.txt
(cd "$repo" && bash "$script" "test: initialize repository" --no-push >/dev/null)

printf 'requested change\n' > "$repo/requested.txt"
printf 'unrelated change\n' > "$repo/unrelated.txt"
sed -i '2c requested hunk' "$repo/mixed.txt"
sed -i '19c unrelated hunk' "$repo/mixed.txt"

printf 'y\n' | (
    cd "$repo"
    bash "$script" --stage-only -- requested.txt >/dev/null
)
assert_equals "requested.txt" "$(git -C "$repo" diff --cached --name-only)" "interactive paths must stage only selected files"
assert_contains "unrelated.txt" "$(git -C "$repo" diff --name-only)" "unrequested files must remain unstaged"

git -C "$repo" reset -q
(
    cd "$repo"
    bash "$script" --stage-only --whole-paths -- requested.txt >/dev/null
)
assert_equals "requested.txt" "$(git -C "$repo" diff --cached --name-only)" "whole paths must stage only named files"
assert_contains "unrelated.txt" "$(git -C "$repo" diff --name-only)" "whole paths must preserve unnamed files"

git -C "$repo" reset -q
printf 'y\nn\n' | (
    cd "$repo"
    bash "$script" --stage-only -- mixed.txt >/dev/null
)
cached_mixed=$(git -C "$repo" diff --cached -- mixed.txt)
unstaged_mixed=$(git -C "$repo" diff -- mixed.txt)
assert_contains "requested hunk" "$cached_mixed" "interactive paths must stage a requested hunk"
assert_not_contains "unrelated hunk" "$cached_mixed" "interactive paths must not stage an unrelated hunk"
assert_contains "unrelated hunk" "$unstaged_mixed" "interactive paths must preserve an unrelated hunk"
assert_not_contains "requested hunk" "$unstaged_mixed" "the selected hunk must leave the working-tree diff"

git -C "$repo" reset -q
git -C "$repo" restore mixed.txt
if (cd "$repo" && bash "$script" --stage-only >/dev/null 2>&1); then
    fail "an empty index without an explicit scope must fail"
fi
assert_equals "" "$(git -C "$repo" diff --cached --name-only)" "implicit staging must leave the index empty"

git -C "$repo" add requested.txt
(
    cd "$repo"
    bash "$script" --stage-only >/dev/null
)
assert_equals "requested.txt" "$(git -C "$repo" diff --cached --name-only)" "implicit mode must preserve the selected index"
assert_equals "unrelated.txt" "$(git -C "$repo" diff --name-only)" "implicit mode must not stage other changes"

git -C "$repo" reset -q

git -C "$repo" add unrelated.txt
if (cd "$repo" && bash "$script" --stage-only -- requested.txt >/dev/null 2>&1); then
    fail "named paths must reject an index that already contains changes"
fi
assert_equals "unrelated.txt" "$(git -C "$repo" diff --cached --name-only)" "a rejected scope must preserve the existing index"

git -C "$repo" reset -q
(
    cd "$repo"
    bash "$script" --stage-only --all >/dev/null
)
assert_equals $'requested.txt\nunrelated.txt' "$(git -C "$repo" diff --cached --name-only)" "--all must stage every change only when requested"

printf 'smart_commit staging tests passed\n'
