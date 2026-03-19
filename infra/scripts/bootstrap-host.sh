#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${VOWGRID_DEPLOY_ROOT:-/opt/vowgrid}"

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  sudo apt-get update -y
  sudo apt-get install -y ca-certificates curl gnupg lsb-release unzip

  if ! command -v docker >/dev/null 2>&1; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
fi

sudo systemctl enable docker
sudo systemctl start docker

if ! groups "$USER" | grep -q '\bdocker\b'; then
  sudo usermod -aG docker "$USER"
fi

sudo mkdir -p "${DEPLOY_ROOT}"/{releases,shared/backups/postgres,shared/backups/redis}
sudo chown -R "$USER":"$USER" "${DEPLOY_ROOT}"

if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
fi

cat <<EOF
Host bootstrap complete.
Deploy root: ${DEPLOY_ROOT}

Next recommended steps:
1. copy infra/.env.production.example into ${DEPLOY_ROOT}/shared/.env.production
2. copy infra/api.env.example into ${DEPLOY_ROOT}/shared/api.env
3. copy infra/web.env.example into ${DEPLOY_ROOT}/shared/web.env
4. configure your domain DNS to this host
5. run the production deploy workflow with real GitHub secrets
EOF
