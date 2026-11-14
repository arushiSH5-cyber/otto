#!/usr/bin/env bash
# serve.sh: start, stop, restart, or check `geniex serve` on the IQ-9075.
#
#   serve.sh run [--keepalive SECONDS] [--compute npu|hybrid|cpu|gpu]     foreground (use a separate terminal)
#   serve.sh start [...same flags]                                   detached, only with an agreed runner
# Defaults: npu, 1800 s; installed v0.10.0 loopback port 18181.
#   serve.sh stop
#   serve.sh restart [...same flags as start]
#   serve.sh status
#
# Why a script: the `geniex` on PATH is a launcher, so `kill $!` does not reach the server (measured).
# Stop checks the port owner's command before signalling it. The server log goes to $GENIEX_SERVE_LOG
# (default ~/geniex-serve.log, the same from any directory) at --log info, and each run/start replaces it.
# A capped request must precede device verification.

set -euo pipefail

PORT="${GENIEX_PORT:-18181}"
LOG="${GENIEX_SERVE_LOG:-$HOME/geniex-serve.log}"
URL="http://127.0.0.1:$PORT"

pid_on_port() {
  ss -ltnp 2>/dev/null | sed -n "s/.*127.0.0.1:$PORT .*pid=\([0-9]*\).*/\1/p" | head -1
}

up() { curl -fsS -o /dev/null -m 3 "$URL/v1/models" 2>/dev/null; }

configure() {
  keepalive=1800; compute=npu
  [ "$PORT" = 18181 ] || { echo "this launcher uses the verified default port 18181; refusing GENIEX_PORT=$PORT" >&2; exit 64; }
  while [ $# -gt 0 ]; do
    case "$1" in
      --keepalive|--compute)
        [ $# -ge 2 ] || { echo "missing value for $1" >&2; exit 64; }
        if [ "$1" = --keepalive ]; then keepalive="$2"; else compute="$2"; fi
        shift 2 ;;
      *) echo "unknown flag: $1" >&2; exit 64 ;;
    esac
  done
  [[ "$keepalive" =~ ^[0-9]+$ ]] || { echo "keepalive must be a nonnegative integer" >&2; exit 64; }
  case "$compute" in npu|hybrid|cpu|gpu) ;; *) echo "invalid compute: $compute" >&2; exit 64 ;; esac
  command -v geniex >/dev/null || { echo "geniex not on PATH" >&2; exit 1; }
}

run() {
  configure "$@"
  if up; then echo "already running on $URL (pid $(pid_on_port)); not taking ownership"; return 0; fi
  echo "foreground server on $URL (compute=$compute, keepalive=${keepalive}s, log=$LOG)"
  geniex serve --compute "$compute" --keepalive "$keepalive" --log info 2>&1 | tee "$LOG"
}

start() {
  configure "$@"
  if up; then echo "already running on $URL (pid $(pid_on_port))"; return 0; fi
  echo "detached server: prefer 'run' in a separate terminal (log=$LOG)"
  nohup geniex serve --compute "$compute" --keepalive "$keepalive" --log info > "$LOG" 2>&1 &
  for _ in $(seq 1 60); do
    if up; then echo "started on $URL (pid $(pid_on_port), compute=$compute, keepalive=${keepalive}s, log=$LOG)"; return 0; fi
    sleep 1
  done
  echo "geniex serve did not answer within 60 s; see $LOG" >&2
  exit 1
}

stop() {
  local pid
  pid="$(pid_on_port)"
  if [ -z "$pid" ]; then echo "not running"; return 0; fi
  local args
  args="$(ps -p "$pid" -o args=)"
  case "$args" in *geniex*) ;; *) echo "refusing to stop non-GenieX pid $pid: $args" >&2; exit 1 ;; esac
  kill "$pid"
  for _ in $(seq 1 15); do
    [ -z "$(pid_on_port)" ] && { echo "stopped (pid $pid)"; return 0; }
    sleep 1
  done
  echo "pid $pid did not exit; try: kill -9 $pid" >&2
  exit 1
}

status() {
  if up; then
    echo "running on $URL (pid $(pid_on_port))"
    # Say so when the NPU evidence is unavailable: a silent gap reads like a missing HTP0 line.
    if [ -f "$LOG" ]; then
      local dev
      dev="$(grep -a "Using .* device(s)" "$LOG" | tail -1 | sed 's/.*resolve_devices\] /  device: /' || true)"
      if [ -n "$dev" ]; then
        echo "$dev"
        echo "  log: $LOG"
      else
        echo "  device: no device line in $LOG yet; send a capped request, then run status again"
      fi
    else
      echo "  device: unknown; no server log at $LOG (was this server started by serve.sh, or with another GENIEX_SERVE_LOG?)"
    fi
    curl -s -m 5 "$URL/v1/models" | python3 -c 'import json,sys; [print("  model:", m["id"]) for m in json.load(sys.stdin)["data"]]'
  else
    echo "not running"
    return 3
  fi
}

cmd="${1:-status}"; shift || true
case "$cmd" in
  run) run "$@" ;;
  start) start "$@" ;;
  stop) stop ;;
  restart) stop; start "$@" ;;
  status) status ;;
  --help|-h) echo "usage: serve.sh run|start|stop|restart|status [--keepalive SECONDS] [--compute npu|hybrid|cpu|gpu]" ;;
  *) echo "usage: serve.sh run|start|stop|restart|status" >&2; exit 64 ;;
esac
