#!/bin/sh
# POSIX shell script to provision an Ubuntu 22.04 EC2 instance for Creapy staging.
# Run as root or via sudo. Idempotent checks included.

set -eu

info() { printf "%s\n" "[INFO] $*"; }
warn() { printf "%s\n" "[WARN] $*"; }
error() { printf "%s\n" "[ERROR] $*"; exit 1; }

info "Updating apt and installing prerequisites"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release apt-transport-https || error "apt install failed"

# Install Docker official repository
DOCKER_KEYRING=/etc/apt/keyrings/docker.gpg
if [ ! -f "$DOCKER_KEYRING" ]; then
  info "Adding Docker GPG key and repository"
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o "$DOCKER_KEYRING" || error "Failed to fetch docker GPG key"
  ARCH=$(dpkg --print-architecture)
  CODENAME=$(lsb_release -cs)
  echo "deb [arch=$ARCH signed-by=$DOCKER_KEYRING] https://download.docker.com/linux/ubuntu $CODENAME stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -y
else
  info "Docker keyring already present, skipping repo setup"
fi

# Install docker engine and compose plugin if not present
if ! command -v docker >/dev/null 2>&1; then
  info "Installing Docker Engine and components"
  apt-get install -y docker-ce docker-ce-cli containerd.io || error "Failed to install docker packages"
else
  info "Docker already installed"
fi

# Ensure docker-compose plugin is available
if ! docker compose version >/dev/null 2>&1; then
  info "Attempting to install docker-compose-plugin via apt"
  apt-get install -y docker-compose-plugin || warn "docker-compose-plugin apt install failed; you may install compose plugin manually"
else
  info "docker compose available"
fi

# Enable and start docker service
if command -v systemctl >/dev/null 2>&1; then
  info "Enabling and starting docker service"
  systemctl enable --now docker || warn "Failed to enable/start docker via systemctl"
fi

# Create 'creapy' user with UID 1000 if it does not exist
CREAPY_USER=creapy
CREAPY_UID=1000
if getent passwd "$CREAPY_USER" >/dev/null 2>&1; then
  existing_uid=$(getent passwd "$CREAPY_USER" | cut -d: -f3)
  if [ "$existing_uid" -ne "$CREAPY_UID" ]; then
    warn "User $CREAPY_USER exists with UID $existing_uid (expected $CREAPY_UID). Please verify ownership expectations."
  else
    info "User $CREAPY_USER already exists with UID $CREAPY_UID"
  fi
else
  info "Creating user $CREAPY_USER with UID $CREAPY_UID"
  useradd -m -u "$CREAPY_UID" -s /bin/bash "$CREAPY_USER" || error "Failed to create user $CREAPY_USER"
fi

# Add creapy to docker group
if getent group docker >/dev/null 2>&1; then
  usermod -aG docker "$CREAPY_USER" || warn "Failed to add $CREAPY_USER to docker group"
else
  info "Docker group missing; creating and adding user"
  groupadd docker || warn "Failed to create docker group"
  usermod -aG docker "$CREAPY_USER" || warn "Failed to add $CREAPY_USER to docker group"
fi

# Create directories
info "Creating directories and setting permissions"
# /srv/uploads must be owned by UID 1000
if [ ! -d /srv/uploads ]; then
  mkdir -p /srv/uploads
  chown -R ${CREAPY_UID}:${CREAPY_UID} /srv/uploads
  chmod 0755 /srv/uploads
  info "/srv/uploads created and ownership set to ${CREAPY_UID}:${CREAPY_UID}"
else
  info "/srv/uploads exists; ensuring ownership"
  chown -R ${CREAPY_UID}:${CREAPY_UID} /srv/uploads || warn "chown failed"
  chmod 0755 /srv/uploads || warn "chmod failed"
fi

# /etc/creapy should be restricted
if [ ! -d /etc/creapy ]; then
  mkdir -p /etc/creapy
  chmod 0700 /etc/creapy
  info "/etc/creapy created with 700 perms"
else
  info "/etc/creapy exists; setting perms to 700"
  chmod 0700 /etc/creapy || warn "chmod failed"
fi

# Recommended next steps
cat <<EOF

Provisioning completed. Recommended next steps (manual):
  1) Place production env file securely on host: /etc/creapy/.env (owner root:root, perms 600).
     Example (secure copy + move):
       scp .env.production admin@<host>:/tmp/.env.production
       sudo mv /tmp/.env.production /etc/creapy/.env
       sudo chown root:root /etc/creapy/.env
       sudo chmod 0600 /etc/creapy/.env

  2) Copy or clone application and docker-compose into /home/creapy/app
       sudo -iu creapy mkdir -p /home/creapy/app
       sudo chown -R ${CREAPY_UID}:${CREAPY_UID} /home/creapy/app
       # then git clone or scp as appropriate

  3) Do NOT run docker compose from this script. Instead, as the creapy user run:
       sudo -iu creapy env ENV_FILE=/etc/creapy/.env /home/creapy/app/scripts/compose-validate.sh
       cd /home/creapy/app
       sudo -iu creapy docker compose --env-file /etc/creapy/.env -f docker-compose.yml build --pull --parallel
       sudo -iu creapy docker compose --env-file /etc/creapy/.env -f docker-compose.yml up -d

EOF

info "Provision script finished successfully"

exit 0
