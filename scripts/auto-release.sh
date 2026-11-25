#!/usr/bin/env bash
# Auto-release: commit any changes, rebuild the portable exe when app files changed, push to GitHub.
# Run by the Claude Code Stop hook (.claude/settings.local.json); safe to run by hand too.
# Prints a single {"systemMessage": ...} JSON line so the result shows up in Claude Code.

cd "$(dirname "$0")/.." || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

LOG="dist/auto-release.log"
mkdir -p dist
: > "$LOG"
notes=()
say() {
  local out="${notes[0]}" n
  for n in "${notes[@]:1}"; do out="$out, $n"; done
  printf '{"systemMessage": "Auto-release: %s"}\n' "$out"
}

# 1) Commit anything uncommitted (Claude normally commits with a proper message first).
if [ -n "$(git status --porcelain)" ]; then
  files=$(git status --porcelain | awk '{print $NF}' | head -5 | paste -sd ' ' -)
  git add -A
  if git commit -q -m "Auto-update: $files" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" >>"$LOG" 2>&1; then
    notes+=("committed $(git rev-parse --short HEAD)")
  else
    notes+=("commit failed, see $LOG"); say; exit 0
  fi
fi

# 2) Rebuild the exe if app files changed since the last successful build.
head=$(git rev-parse HEAD)
built=$(cat dist/.built-commit 2>/dev/null)
if [ "$built" != "$head" ]; then
  need_build=1
  if [ -n "$built" ] && git cat-file -e "$built^{commit}" 2>/dev/null &&
     [ -z "$(git diff --name-only "$built" "$head" -- main.js preload.js db.js renderer build package.json package-lock.json)" ]; then
    need_build=0
  fi
  if [ "$need_build" = 1 ]; then
    # A running copy of the app locks the exe and electron-builder would wait forever, so skip instead.
    if tasklist //NH 2>/dev/null | grep -qi "AITrain"; then
      notes+=("exe NOT rebuilt: the app is open, close it and it rebuilds next time")
    elif timeout 900 npm run dist >>"$LOG" 2>&1; then
      notes+=("exe rebuilt")
      echo "$head" > dist/.built-commit
    else
      notes+=("exe build FAILED, see $LOG")
    fi
    # Not recording .built-commit on skip/failure means the next run tries again.
  else
    echo "$head" > dist/.built-commit
  fi
fi

# 3) Push if GitHub is behind. Never prompt: a hook can't answer a sign-in dialog.
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$(git rev-parse "origin/$branch" 2>/dev/null)" != "$head" ]; then
  if GCM_INTERACTIVE=never GIT_TERMINAL_PROMPT=0 timeout 120 git push -q origin "$branch" >>"$LOG" 2>&1; then
    notes+=("pushed to GitHub")
  else
    notes+=("push FAILED (GitHub sign-in needed?), see $LOG")
  fi
fi

[ ${#notes[@]} -gt 0 ] && say
exit 0
