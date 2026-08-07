# Template systemd unit for running the Creapy docker-compose stack as the creapy user
# Replace template variables before enabling: {{APP_DIR}}, {{COMPOSE_FILE}}
# Example usage:
#  sudo cp scripts/systemd/creapy-stack.service.tpl /etc/systemd/system/creapy-stack.service
#  sudo sed -e 's|{{APP_DIR}}|/home/creapy/app|g' -e 's|{{COMPOSE_FILE}}|docker-compose.yml|g' -i /etc/systemd/system/creapy-stack.service
#  sudo systemctl daemon-reload
#  sudo systemctl enable --now creapy-stack.service

[Unit]
Description=Creapy Docker Compose Stack
After=network.target docker.service
Requires=docker.service

[Service]
Type=simple
User=creapy
Group=creapy
WorkingDirectory={{APP_DIR}}
# Wait for Docker to be responsive before starting
ExecStartPre=/bin/sh -c 'until /usr/bin/docker info >/dev/null 2>&1; do sleep 1; done'
# Start the compose stack (no build) as the creapy user
ExecStart=/usr/bin/docker compose --env-file /etc/creapy/.env -f {{COMPOSE_FILE}} up --no-build --detach
# Stop and remove containers when service is stopped
ExecStop=/usr/bin/docker compose --env-file /etc/creapy/.env -f {{COMPOSE_FILE}} down
Restart=unless-stopped
RestartSec=5
TimeoutStartSec=120
TimeoutStopSec=60

[Install]
WantedBy=multi-user.target
