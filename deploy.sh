#!/bin/bash
set -e

SERVER="${DEPLOY_SERVER:-root@178.156.202.136}"
APP_DIR="/opt/menu"
COMPOSE="docker compose -f docker-compose.prod.yml"

echo "==> Syncing compose and schema files to server..."
rsync -avz --relative -e ssh \
  docker-compose.prod.yml docs/schema.sql \
  ${SERVER}:${APP_DIR}/

echo "==> Ensuring shared Docker network exists..."
ssh ${SERVER} "docker network inspect web >/dev/null 2>&1 || docker network create web"

echo "==> Pulling latest image and restarting..."
ssh ${SERVER} "cd ${APP_DIR} && ${COMPOSE} pull menu-app && ${COMPOSE} up -d"

echo "==> Waiting for service to start..."
sleep 10

echo "==> Checking health..."
for i in $(seq 1 6); do
    if ssh ${SERVER} "curl -sf http://localhost:3001/api/health"; then
        echo ""
        echo "==> Deployment complete!"
        echo "==> Access your app at: https://whatsonthemenu.app"
        exit 0
    fi
    echo "    Attempt $i/6 failed, retrying in 10s..."
    sleep 10
done

echo ""
echo "!!! Health check failed after 60s!"
echo "!!! Check logs with:"
echo "    ssh ${SERVER} 'cd ${APP_DIR} && ${COMPOSE} logs menu-app'"
exit 1
