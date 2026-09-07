#!/bin/bash
# Smart Git Commit Script for the git-commit skill
# Handles staging, commit message generation, and opt-in pushing

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${GREEN}→${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1" >&2; }

# --- arguments ---
DRY_RUN=false
PUSH=false
STAGING_ONLY=false
STAGE_ALL=false
WHOLE_PATHS=false
COMMIT_MSG=""
PATHS=()

while [ "$#" -gt 0 ]; do
    case "$1" in
        --dry-run)    DRY_RUN=true ;;
        --no-push)    ;;
        --push)       PUSH=true ;;
        --stage-only) STAGING_ONLY=true ;;
        --all)        STAGE_ALL=true ;;
        --whole-paths) WHOLE_PATHS=true ;;
        --)
            shift
            PATHS=("$@")
            break
            ;;
        --help|-h)
            echo "usage: smart_commit.sh [message] [options] [-- <path>...]"
            echo ""
            echo "  [message]     commit message (quote multi-word messages)."
            echo "                omit to auto-generate from the staged diff."
            echo "  --dry-run     show the selected staged changes without committing or pushing."
            echo "  --push        push to remote after committing (opt in)."
            echo "  --no-push     accepted for compatibility; no push (default)."
            echo "  --stage-only  show the selected staged changes. no commit, no push."
            echo "  --whole-paths stage every change in paths supplied after --."
            echo "  --all         explicitly stage every repository change."
            echo "  -- <path>...  interactively select hunks in these paths."
            echo "                omit paths to use the existing index."
            exit 0
            ;;
        --*)
            error "unknown option: $1"
            exit 2
            ;;
        *)
            if [ -n "$COMMIT_MSG" ]; then
                error "unexpected argument: $1"
                error "put repository paths after --."
                exit 2
            fi
            COMMIT_MSG="$1"
            ;;
    esac
    shift
done

if [ "$STAGE_ALL" = true ] && { [ "$WHOLE_PATHS" = true ] || [ "${#PATHS[@]}" -gt 0 ]; }; then
    error "use --all by itself."
    exit 2
fi

if [ "$WHOLE_PATHS" = true ] && [ "${#PATHS[@]}" -eq 0 ]; then
    error "--whole-paths requires paths after --."
    exit 2
fi

# --- safety: refuse to commit to protected branches without explicit message ---
CURRENT_BRANCH=$(git symbolic-ref --quiet --short HEAD || git rev-parse --abbrev-ref HEAD)
info "current branch: $CURRENT_BRANCH"

if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == "master" ]] && [ -z "$COMMIT_MSG" ] && [ "$DRY_RUN" = false ] && [ "$STAGING_ONLY" = false ]; then
    error "on protected branch '$CURRENT_BRANCH' with no explicit commit message."
    error "provide a message: smart_commit.sh \"type(scope): description\""
    exit 1
fi

# --- stage only the requested scope ---
if [ "$STAGE_ALL" = true ]; then
    info "staging every repository change (--all)..."
    git add --all
elif [ "${#PATHS[@]}" -gt 0 ]; then
    if ! git diff --cached --quiet; then
        error "the index already contains staged changes."
        error "commit those changes first, or unstage them before selecting paths."
        exit 1
    fi
    if [ "$WHOLE_PATHS" = true ]; then
        info "staging every change in ${#PATHS[@]} requested path(s)..."
        git add -- "${PATHS[@]}"
    else
        info "selecting requested hunks in ${#PATHS[@]} path(s)..."
        git add --patch -- "${PATHS[@]}"
    fi
else
    info "using existing staged changes without staging anything else..."
fi

if git diff --cached --quiet; then
    error "no staged changes."
    error "stage selected hunks, pass paths after --, use --whole-paths, or use --all explicitly."
    exit 1
fi

# get staged files for commit message analysis
STAGED_FILES=$(git diff --cached --name-only)
DIFF_STAT=$(git diff --cached --stat)
NUM_FILES=$(echo "$STAGED_FILES" | wc -l | xargs)

# --- Determine commit type from file patterns ---
determine_commit_type() {
    local files="$1"

    # Build/test infrastructure changes
    if echo "$files" | grep -qE "(^|/)(test|tests|spec|specs|__tests__|e2e)/" || \
       echo "$files" | grep -qE "\.(test|spec)\.(js|ts|py|go|rs|java|rb)\$"; then
        echo "test"
    # Documentation-only
    elif echo "$files" | grep -qE "\.(md|txt|rst|adoc|tex)\$" && \
         ! echo "$files" | grep -qvE "\.(md|txt|rst|adoc|tex)\$"; then
        echo "docs"
    # Dependency / config manifests
    elif echo "$files" | grep -qE "(^|/)(package\.json|package-lock\.json|yarn\.lock|pnpm-lock\.yaml|requirements\.txt|Pipfile\.lock|poetry\.lock|Cargo\.toml|Cargo\.lock|go\.mod|go\.sum|gemfile|Gemfile\.lock|composer\.json|composer\.lock)\$"; then
        echo "chore"
    # CI/CD pipeline config
    elif echo "$files" | grep -qE "(^|/)(\.github/workflows|\.gitlab-ci|\.circleci|Jenkinsfile|azure-pipelines|\.travis\.yml)"; then
        echo "ci"
    # Build / tooling config (not deps)
    elif echo "$files" | grep -qE "(^|/)(webpack|rollup|vite|esbuild|tsconfig|jest|vitest|eslint|prettier|babel|\.eslintrc|\.prettierrc)\.?.*\.(js|ts|json|yml|yaml|mjs|cjs)\$" || \
         echo "$files" | grep -qE "(^|/)Makefile|CMakeLists\.txt"; then
        echo "build"
    # Style/formatting only (no logic changes)
    elif git diff --cached --shortstat | grep -qE "insertion|deletion" && \
         ! git diff --cached --numstat | awk '{if ($1!="0" && $2!="0") found=1} END{exit !found}'; then
        # All files have both insertions and deletions of similar magnitude — likely refactor
        echo "refactor"
    else
        echo "feat"
    fi
}

# --- Determine scope from most-represented directory ---
determine_scope() {
    local files="$1"

    # Count directory frequency, pick the most common top-level dir
    local most_common
    most_common=$(echo "$files" | \
        sed -E 's|^\./||; s|^([^/]+)/.*|\1|' | \
        sort | uniq -c | sort -rn | head -1 | awk '{print $2}')

    # Known component patterns
    if echo "$files" | grep -qE "(^|/)components/"; then
        echo "ui"
    elif echo "$files" | grep -qE "(^|/)skills/[^/]+/SKILL\.md\$"; then
        echo "skills"
    elif echo "$files" | grep -qE "(^|/)agents/.*\.md\$"; then
        echo "agents"
    elif [ -n "$most_common" ] && [ "$most_common" != "." ]; then
        echo "$most_common"
    else
        echo ""
    fi
}

# --- Generate a meaningful description from the actual changes ---
determine_description() {
    local files="$1"
    local commit_type="$2"
    local num_files="$3"

    # For docs, describe what docs
    if [ "$commit_type" = "docs" ]; then
        if echo "$files" | grep -qiE "readme"; then
            echo "update README"
        elif echo "$files" | grep -qiE "changelog"; then
            echo "update changelog"
        elif echo "$files" | grep -qiE "license"; then
            echo "update license info"
        else
            echo "update documentation"
        fi
        return
    fi

    # For test-only changes
    if [ "$commit_type" = "test" ]; then
        if git diff --cached --numstat | awk '{sum+=$1} END{exit !(sum>50)}'; then
            echo "add test coverage"
        else
            echo "update tests"
        fi
        return
    fi

    # For deps
    if [ "$commit_type" = "chore" ]; then
        if echo "$files" | grep -qiE "lock"; then
            echo "update lockfile"
        else
            echo "update dependencies"
        fi
        return
    fi

    if [ "$commit_type" = "ci" ]; then
        echo "update CI pipeline"
        return
    fi

    if [ "$commit_type" = "build" ]; then
        echo "update build configuration"
        return
    fi

    # For feat/refactor/fix — analyze what actually changed
    local added_lines removed_lines
    added_lines=$(git diff --cached --numstat | awk '{s+=$1} END{print s+0}')
    removed_lines=$(git diff --cached --numstat | awk '{s+=$2} END{print s+0}')

    # Large changeset
    if [ "$num_files" -gt 10 ]; then
        echo "update across $num_files files"
        return
    fi

    # New files (additions-heavy)
    if [ "$removed_lines" -eq 0 ] && [ "$added_lines" -gt 5 ]; then
        local new_files
        new_files=$(git diff --cached --diff-filter=A --name-only | wc -l | xargs)
        if [ "$new_files" -gt 0 ]; then
            echo "add $new_files new file(s)"
            return
        fi
    fi

    # Default: concise summary
    echo "update $num_files file(s)"
}

# --- Stage-only mode: show what's staged and exit ---
if [ "$STAGING_ONLY" = true ]; then
    info "Staged $NUM_FILES file(s):"
    echo "$DIFF_STAT"
    exit 0
fi

# --- Dry-run mode: show planned commit without executing ---
if [ "$DRY_RUN" = true ]; then
    info "Dry run — staged $NUM_FILES file(s):"
    echo "$DIFF_STAT"
    if [ -n "$COMMIT_MSG" ]; then
        echo ""
        info "Planned commit message:"
        echo "  $COMMIT_MSG"
    else
        # Show what the auto-gen would produce
        COMMIT_TYPE=$(determine_commit_type "$STAGED_FILES")
        SCOPE=$(determine_scope "$STAGED_FILES")
        DESCRIPTION=$(determine_description "$STAGED_FILES" "$COMMIT_TYPE" "$NUM_FILES")
        if [ -n "$SCOPE" ]; then
            AUTO_MSG="${COMMIT_TYPE}(${SCOPE}): ${DESCRIPTION}"
        else
            AUTO_MSG="${COMMIT_TYPE}: ${DESCRIPTION}"
        fi
        echo ""
        info "Auto-generated commit message would be:"
        echo "  $AUTO_MSG"
        warn "Pass an explicit message for better results."
    fi
    exit 0
fi


# --- Generate or use provided commit message ---
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_TYPE=$(determine_commit_type "$STAGED_FILES")
    SCOPE=$(determine_scope "$STAGED_FILES")
    DESCRIPTION=$(determine_description "$STAGED_FILES" "$COMMIT_TYPE" "$NUM_FILES")

    if [ -n "$SCOPE" ]; then
        COMMIT_MSG="${COMMIT_TYPE}(${SCOPE}): ${DESCRIPTION}"
    else
        COMMIT_MSG="${COMMIT_TYPE}: ${DESCRIPTION}"
    fi

    info "Generated commit message: $COMMIT_MSG"
    warn "For better messages, pass an explicit message."
else
    info "Using provided message: $COMMIT_MSG"
fi

# --- Commit (no co-author, no AI footer) ---
git commit -m "$COMMIT_MSG"

COMMIT_HASH=$(git rev-parse --short HEAD)
info "Created commit: $COMMIT_HASH ($COMMIT_MSG)"

# --- Push (when explicitly requested) ---
if [ "$PUSH" = true ]; then
    info "Pushing to origin/$CURRENT_BRANCH..."

    # Check if branch exists on remote
    if git ls-remote --exit-code --heads origin "$CURRENT_BRANCH" >/dev/null 2>&1; then
        # Branch exists, just push
        if git push; then
            info "Successfully pushed to origin/$CURRENT_BRANCH"
            echo "$DIFF_STAT"
        else
            error "Push failed"
            exit 1
        fi
    else
        # New branch, push with -u
        if git push -u origin "$CURRENT_BRANCH"; then
            info "Successfully pushed new branch to origin/$CURRENT_BRANCH"
            echo "$DIFF_STAT"

            # Check if it's GitHub and show PR link
            REMOTE_URL=$(git remote get-url origin)
            if echo "$REMOTE_URL" | grep -q "github.com"; then
                REPO=$(echo "$REMOTE_URL" | sed -E 's/.*github\.com[:/](.*)\.git/\1/')
                warn "Create PR: https://github.com/$REPO/pull/new/$CURRENT_BRANCH"
            fi
        else
            error "Push failed"
            exit 1
        fi
    fi
else
    info "Skipping push (default; pass --push to opt in)"
    echo "$DIFF_STAT"
fi

exit 0
