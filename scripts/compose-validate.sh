#!/bin/sh
# Validate the Docker Compose stack before operators build or start services.

set -eu

COMPOSE_FILE="${1:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-}"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if [ -z "$ENV_FILE" ] && [ -f .env ]; then
  ENV_FILE=.env
fi

if [ -n "$ENV_FILE" ]; then
  if [ ! -f "$ENV_FILE" ]; then
    echo "ERROR: env file not found: $ENV_FILE" >&2
    exit 1
  fi
  case "$ENV_FILE" in
    */*) ;;
    *) ENV_FILE="./$ENV_FILE" ;;
  esac
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required for compose validation." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 is required." >&2
  exit 1
fi

docker compose -f "$COMPOSE_FILE" config >/dev/null

echo "Compose validation passed: $COMPOSE_FILE"
