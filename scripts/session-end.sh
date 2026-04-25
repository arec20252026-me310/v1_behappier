#!/bin/bash
# scripts/session-end.sh
# Push all local workflow JSONs to n8n

set -e
source "$(dirname "$0")/../.env"

echo "=== SESSION END ==="

echo "Pushing workflows to n8n..."
PUSH_ERRORS=0
for file in n8n/workflows/*.json; do
  WF_ID=$(jq -r '.id' "$file")
  HTTP_STATUS=$(curl -s -o /tmp/n8n_response.json -w "%{http_code}" \
    -X PUT "$N8N_URL/api/v1/workflows/$WF_ID" \
    -H "X-N8N-API-KEY: $N8N_API_KEY" \
    -H "Content-Type: application/json" \
    -d @"$file")
  if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "  ✓ Pushed $file"
  else
    echo "  ✗ Failed to push $file (HTTP $HTTP_STATUS)"
    cat /tmp/n8n_response.json
    PUSH_ERRORS=$((PUSH_ERRORS + 1))
  fi
done

if [ "$PUSH_ERRORS" -gt 0 ]; then
  echo "WARNING: $PUSH_ERRORS workflow(s) failed to push to n8n."
  echo "Fix the errors above before closing the session."
  exit 1
fi

echo "=== SESSION END COMPLETE. n8n is up to date. ==="
