#!/bin/bash
set -e

SERVER="root@178.156.202.136"
APP_DIR="/opt/menu"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Syncing menu app files to server..."
rsync -avz --exclude '.git' --exclude 'node_modules' --exclude 'dist' --exclude 'data/' \
  -e ssh ./ ${SERVER}:${APP_DIR}/

echo "==> Ensuring shared Docker network exists..."
ssh ${SERVER} "docker network inspect web >/dev/null 2>&1 || docker network create web"

echo "==> Building and starting menu app containers..."
ssh ${SERVER} "cd ${APP_DIR} && ${COMPOSE} up -d --build"

echo "==> Waiting for service to start..."
sleep 5

echo "==> Checking health..."
if ssh ${SERVER} "docker exec menu-menu-app-1 curl -sf http://localhost:3001/api/health"; then
    echo ""
    echo "==> Deployment complete!"
    echo "==> Access your app at: https://whatsonthemenu.app"
else
    echo ""
    echo "!!! Health check failed!"
    echo "!!! Check logs with:"
    echo "    ssh ${SERVER} 'cd ${APP_DIR} && ${COMPOSE} logs menu-app'"
    exit 1
fi
