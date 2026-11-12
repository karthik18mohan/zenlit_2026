#!/bin/bash
# Logs xtool in to Apple Developer Services with an Apple ID on a CI runner.
#
# Apple asks for a two-factor code during login. The runner can't be typed
# into, so this waits for the code to appear on the branch in
# xtool-app/ci/2fa-code.txt as "<github run id> <code>" and feeds it to xtool.
set -euo pipefail

xtool_bin="$1"
code_file="xtool-app/ci/2fa-code.txt"
log="$RUNNER_TEMP/xtool-login.log"
fifo="$RUNNER_TEMP/xtool-login.in"

# Secrets pasted on a phone often pick up a stray space or newline.
trim() { printf '%s' "$1" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
APPLE_ID="$(trim "$APPLE_ID")"
APPLE_PASSWORD="$(trim "$APPLE_PASSWORD")"

mkfifo "$fifo"
exec 3<>"$fifo"

"$xtool_bin" auth login --mode password \
    --username "$APPLE_ID" --password "$APPLE_PASSWORD" <&3 >"$log" 2>&1 &
pid=$!

sent=""
announced=""
for _ in $(seq 1 180); do
    kill -0 "$pid" 2>/dev/null || break
    if [ -z "$sent" ] && grep -q "Code: " "$log"; then
        if [ -z "$announced" ]; then
            echo "::notice::xtool is waiting for the Apple two-factor code (run $GITHUB_RUN_ID)"
            announced=1
        fi
        git fetch -q origin "$GITHUB_REF_NAME" || true
        line="$(git show "FETCH_HEAD:$code_file" 2>/dev/null || true)"
        if [ "${line%% *}" = "$GITHUB_RUN_ID" ]; then
            echo "${line##* }" >&3
            sent=1
            echo "Two-factor code received."
        fi
    fi
    sleep 5
done

if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "::error::Timed out waiting for login"
    cat "$log"
    exit 1
fi

rc=0
wait "$pid" || rc=$?
cat "$log"
exit "$rc"
