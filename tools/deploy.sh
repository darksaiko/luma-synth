#!/bin/bash
# Auto-deploy for Luma Pad.
# Run by a cPanel cron job every few minutes: checks GitHub for a new version and,
# when there is one, copies everything in the repo's app/ folder into the live folder.
# Paths can be overridden with environment variables (used for testing).

REPO="${REPO:-/home/alpacaqr/repositories/pad}"
LIVE="${LIVE:-/home/alpacaqr/public_html/pad}"
LOG="${LOG:-/home/alpacaqr/deploy-pad.log}"
LOCK="${LOCK:-/home/alpacaqr/.deploy-pad.lock}"
STATE="${STATE:-/home/alpacaqr/.deploy-pad.last}"

main() {
  cd "$REPO" || exit 1

  # Only one run at a time: if a previous run is still going, this one just skips.
  if command -v flock >/dev/null 2>&1; then exec 9>"$LOCK"; flock -n 9 || exit 0; fi
  # Never let a check hang: give up on GitHub after 60 seconds and try again on the next run.
  local T=""; command -v timeout >/dev/null 2>&1 && T="timeout 60"

  $T git fetch -q origin main 2>>"$LOG" || { echo "$(date '+%F %T') fetch failed" >> "$LOG"; exit 1; }

  # Make the repo folder match GitHub exactly (this folder is only used for deploying).
  git reset -q --hard origin/main 2>>"$LOG" || { echo "$(date '+%F %T') reset failed" >> "$LOG"; exit 1; }

  local NEW; NEW="$(git rev-parse HEAD)"
  # Copy when there is a new commit, or when the live folder is missing its main file.
  if [ "$NEW" != "$(cat "$STATE" 2>/dev/null)" ] || [ ! -f "$LIVE/index.html" ]; then
    if mkdir -p "$LIVE" && cp -Rf "$REPO/app/." "$LIVE/"; then
      echo "$NEW" > "$STATE"
      echo "$(date '+%F %T') deployed $(git rev-parse --short HEAD): $(git log -1 --pretty=%s)" >> "$LOG"
    else
      echo "$(date '+%F %T') copy failed" >> "$LOG"
    fi
  fi
}

# The whole script is read before main runs, so it is safe for the git reset above to replace this file.
main
exit
