#!/bin/bash
# scripts/session-start.sh
# Pull latest workflows from n8n

set -e
source "$(dirname "$0")/../.env"

echo "=== SESSION START ==="

echo "Pulling workflows from n8n..."
WORKFLOWS=$(curl -s "$N8N_URL/api/v1/workflows?limit=200" \
  -H "X-N8N-API-KEY: $N8N_API_KEY" | jq -r '.data[].id')

mkdir -p n8n/workflows

for ID in $WORKFLOWS; do
  FILENAME="n8n/workflows/${ID}.json"
  curl -s "$N8N_URL/api/v1/workflows/$ID" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    | jq '.' > "$FILENAME"
  echo "  Pulled workflow $ID → $FILENAME"
done

echo "=== SESSION START COMPLETE. Safe to begin. ==="
