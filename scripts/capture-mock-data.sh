#!/usr/bin/env bash
#
# Capture real Postgres responses into lib/mock-data/*.json so the app can
# boot in mock mode without a DB. Run when the underlying data shape or
# the curated catalog changes.
#
# Prerequisites:
#   - Local Postgres running with the `wisecode` schema populated.
#   - DATABASE_URL pointing at it in .env.local.
#   - Prod server running on http://localhost:3000:
#       corepack yarn build && corepack yarn start
#   - jq + docker on PATH.
#   - Postgres container name `pg-15` (adjust DOCKER_PG below if different).
#
# Output:
#   lib/mock-data/expressions.json
#   lib/mock-data/foods.json
#   lib/mock-data/upcs.json

set -euo pipefail

DOCKER_PG=${DOCKER_PG:-pg-15}
PG_DB=${PG_DB:-wisecode}
PG_USER=${PG_USER:-postgres}
BASE_URL=${BASE_URL:-http://localhost:3000}
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/lib/mock-data"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "→ capturing expressions from $BASE_URL/api/codes"
curl -fsS "$BASE_URL/api/codes" | jq '.codes' > "$OUT_DIR/expressions.json"
echo "  expressions: $(jq 'length' "$OUT_DIR/expressions.json")"

echo "→ building all-expressions slots payload"
jq '[.[].id] | map({expressionId: ., weight: 1})' "$OUT_DIR/expressions.json" > "$TMP/slots.json"

echo "→ capturing 4 browse pages of 100 (top, +200, +500, +800)"
for off in 0 200 500 800; do
  jq -n --slurpfile s "$TMP/slots.json" --argjson o "$off" \
    '{slots: $s[0], offset: $o, limit: 100}' \
    | curl -fsS -X POST "$BASE_URL/api/browse" -H 'Content-Type: application/json' --data @- \
    > "$TMP/browse-$off.json"
done

echo "→ merging unique foods"
jq -s '[.[] | .items[]] | unique_by(.foodId) | reduce .[] as $f ({}; .[$f.foodId] = $f)' \
  "$TMP"/browse-*.json > "$OUT_DIR/foods.json"
echo "  foods: $(jq 'keys | length' "$OUT_DIR/foods.json")"

echo "→ capturing UPCs for those foods (via temp table)"
jq -r 'keys[]' "$OUT_DIR/foods.json" > "$TMP/food-ids.txt"
docker cp "$TMP/food-ids.txt" "$DOCKER_PG:/tmp/food-ids.txt"
docker exec "$DOCKER_PG" psql -U "$PG_USER" -d "$PG_DB" -tAc "
  CREATE TEMP TABLE ids(id uuid);
  COPY ids FROM '/tmp/food-ids.txt';
  SELECT DISTINCT f.id::text, unnest(p.upc)
  FROM wisecode_gold.food f
  JOIN ids i ON i.id = f.id
  JOIN wisecode_gold.product p ON p.food_id = f.id
" | grep '|' > "$TMP/upcs.txt"

awk -F'|' 'BEGIN{print "{"} NR>1{printf ","} {printf "\"%s\":\"%s\"\n", $2, $1} END{print "}"}' \
  "$TMP/upcs.txt" > "$OUT_DIR/upcs.json"
echo "  upcs: $(jq 'keys | length' "$OUT_DIR/upcs.json")"

echo "✓ fixtures written to $OUT_DIR"
