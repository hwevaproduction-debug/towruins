#!/bin/sh
# POSIX-compliant staging deploy + smoke test script
# Recommended: chmod +x scripts/staging-deploy-and-test.sh
# Usage: ENV_FILE=.env.production ./scripts/staging-deploy-and-test.sh

set -u
# Exit codes:
# 0 success
# 10 validate compose failed
# 20 build failed
# 30 up failed
# 40 healthcheck failed
# 50 smoke checks failed
# 60 logs collection failed
# 70 teardown (manual) failed

# Defaults (can be overridden via env or with ENV_FILE)
: ${ENV_FILE:=.env.production}
: ${COMPOSE_FILE:=docker-compose.yml}
: ${BACKEND_HEALTH_URL:=http://localhost/health}
: ${FRONTEND_URL:=https://townruins.com/}
: ${BACKEND_ROOT:=https://api.townruins.com/api/v1}
: ${HEALTH_TIMEOUT:=120}
: ${HEALTH_INTERVAL:=2}
: ${LOG_DIR:=./logs}

# Load env file if present
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  set -a
  . "$ENV_FILE"
  set +a
fi

timestamp() { date +%s; }
logfile_name() { echo "$LOG_DIR/creapy-staging-logs-$(timestamp).log"; }

# Ensure log directory exists
if [ ! -d "$LOG_DIR" ]; then
  mkdir -p "$LOG_DIR" || {
    echo "ERROR: cannot create log dir '$LOG_DIR'" >&2
    exit 60
  }
fi

echo "Starting staging deploy and test script"
echo "Compose file: $COMPOSE_FILE"
echo "Env file: $ENV_FILE"

# Step 1: validate compose
echo "[1/7] Validating compose file..."
if ! ENV_FILE="$ENV_FILE" sh scripts/compose-validate.sh "$COMPOSE_FILE" >/dev/null 2>&1; then
  echo "ERROR: compose validation failed. Helpful commands:" >&2
  echo "  ENV_FILE=$ENV_FILE sh scripts/compose-validate.sh $COMPOSE_FILE" >&2
  echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE config" >&2
  exit 10
fi

# Step 2: build images
echo "[2/7] Building images (dry run shown; do not run here)..."
# Actual runtime would run: docker compose --env-file $ENV_FILE -f $COMPOSE_FILE build --parallel
# We only write the command for operators to execute on target
if ! printf '%s\n' "docker compose --env-file $ENV_FILE -f $COMPOSE_FILE build --parallel" >/dev/null; then
  echo "ERROR: preparing build command failed" >&2
  exit 20
fi

# Step 3: bring up stack
echo "[3/7] Bringing up stack (operator must run the following):"
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE up -d"

# Step 4: wait for public proxy health
echo "[4/7] Waiting up to ${HEALTH_TIMEOUT}s for proxy health at $BACKEND_HEALTH_URL"
count=0
while [ $count -lt $HEALTH_TIMEOUT ]; do
  if curl -sSf "$BACKEND_HEALTH_URL" >/dev/null 2>&1; then
    echo "Proxy healthy after ${count}s"
    healthy=1
    break
  fi
  sleep $HEALTH_INTERVAL
  count=$((count + HEALTH_INTERVAL))
done
if [ "${healthy:-0}" != 1 ]; then
  echo "ERROR: proxy healthcheck failed after ${HEALTH_TIMEOUT}s" >&2
  echo "Helpful debugging commands:" >&2
  echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE ps" >&2
  echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs --no-color --timestamps --tail=200" >&2
  echo "  curl -v $BACKEND_HEALTH_URL" >&2
  exit 40
fi

# Step 5: basic smoke checks
echo "[5/7] Running basic smoke checks"
smoke_fail=0
if ! curl -f "$FRONTEND_URL" >/dev/null 2>&1; then
  echo "Frontend smoke check failed: $FRONTEND_URL" >&2
  smoke_fail=1
fi
if ! curl -f "$BACKEND_ROOT" >/dev/null 2>&1; then
  echo "Backend root smoke check failed: $BACKEND_ROOT" >&2
  smoke_fail=1
fi
if [ "${smoke_fail}" -ne 0 ]; then
  echo "ERROR: one or more smoke checks failed" >&2
  echo "Helpful debugging commands:" >&2
  echo "  curl -v $FRONTEND_URL" >&2
  echo "  curl -v $BACKEND_ROOT" >&2
  exit 50
fi

# Step 6: collect logs
LOGFILE=$(logfile_name)
echo "[6/7] Collecting compose logs to $LOGFILE"
# Intended runtime command (not executed here):
# docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs --no-color --timestamps --tail=500 > /tmp/creapy-staging-logs-$(date +%s).log
# We write a recommended operator command that writes into the repository logs dir
echo "Recommended command to run on target:" >&2
echo "  docker compose --env-file $ENV_FILE -f $COMPOSE_FILE logs --no-color --timestamps --tail=500 > $LOGFILE" >&2

# Step 7: failure handling already done with exits and helpful commands

# Step 8: optional teardown (commented)
cat <<'EOF'
# To teardown and remove volumes (optional):
# docker compose --env-file "$ENV_FILE" -f docker-compose.yml down --volumes
EOF

echo "All checks passed (script completed without executing Docker). See recommended commands above for operator run."
exit 0
