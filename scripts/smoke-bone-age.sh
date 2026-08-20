#!/usr/bin/env bash
#
# End-to-end check of the bone-age pipeline against a running backend.
#
#     scripts/smoke-bone-age.sh                       # production
#     scripts/smoke-bone-age.sh http://localhost:3001 # local
#
# Registers a throwaway account, uploads an X-ray, waits for the model to resolve it, and
# deletes everything it created. Run it after every model swap — verify:model proves the
# weights work on your machine, this proves the deployed service works.
#
# Exits non-zero if the prediction does not reach COMPLETED.

set -uo pipefail

API="${1:-https://growth-backend-a479.onrender.com}"
IMAGE="${VERIFY_IMAGE:-$(dirname "$0")/../backend/test/fixtures/hand.png}"
EMAIL="smoke-$(date +%s)-$RANDOM@example.invalid"
PASSWORD='SmokeTest!2026'
TOKEN=""

json() { python3 -c "import sys,json;d=json.load(sys.stdin);print(d$1)" 2>/dev/null; }

cleanup() {
  if [ -n "$TOKEN" ]; then
    # Hard-deletes the user and any child they solely guard, which cascades to predictions.
    curl -s -m 60 -X DELETE "$API/users/me" -H "Authorization: Bearer $TOKEN" -o /dev/null
    echo "cleaned up $EMAIL"
  fi
}
trap cleanup EXIT

[ -f "$IMAGE" ] || { echo "no image at $IMAGE"; exit 1; }

echo "api   : $API"
echo "image : $IMAGE"

# The free instance sleeps after 15 minutes; the first call can take a minute to come back.
echo -n "health... "
curl -s -m 120 "$API/health" || { echo "backend unreachable"; exit 1; }
echo

echo -n "register... "
TOKEN=$(curl -s -m 120 -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"fullName\":\"Smoke Test\",\"phoneNumber\":\"0812345678\",\"acceptedTerms\":true}" \
  | json "['accessToken']")
[ -n "$TOKEN" ] || { echo "failed"; exit 1; }
echo "ok"

echo -n "model-status... "
STATUS=$(curl -s -m 60 "$API/bone-age/model-status" -H "Authorization: Bearer $TOKEN")
echo "$STATUS"
if ! echo "$STATUS" | grep -q '"ready":true'; then
  echo "FAIL: model is not loaded on the server — check the build fetched the release asset"
  exit 1
fi

echo -n "create child... "
CHILD=$(curl -s -m 60 -X POST "$API/children" -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"Smoke Test Child","sex":"MALE","dateOfBirth":"2016-03-15","relation":"PARENT"}' \
  | json "['id']")
[ -n "$CHILD" ] || { echo "failed"; exit 1; }
echo "$CHILD"

echo -n "upload... "
UPLOAD=$(curl -s -m 120 -X POST "$API/bone-age/upload" -H "Authorization: Bearer $TOKEN" \
  -F "file=@$IMAGE;type=image/png" -F "childId=$CHILD")
PRED=$(echo "$UPLOAD" | json "['id']")
[ -n "$PRED" ] || { echo "failed: $UPLOAD"; exit 1; }
echo "$PRED ($(echo "$UPLOAD" | json "['status']"))"

# Inference takes well under a second warm; this is generous for a cold instance.
for i in $(seq 1 20); do
  sleep 3
  ROW=$(curl -s -m 60 "$API/bone-age/history?childId=$CHILD" -H "Authorization: Bearer $TOKEN" \
    | python3 -c "import sys,json;d=json.load(sys.stdin);p=d[0];print(p['status'],p.get('predictedAgeMonths'),p.get('modelVersion'),p.get('failureReason'))")
  echo "  poll $i: $ROW"
  case "$ROW" in
    COMPLETED*) MONTHS=$(echo "$ROW" | awk '{print $2}')
      echo "PASS: bone age $MONTHS months ($(python3 -c "print(f'{$MONTHS/12:.1f}')")y)"
      # Guardian check on the radiograph bytes: authorised yes, anonymous no.
      WITH=$(curl -s -m 60 -o /dev/null -w '%{http_code}' "$API/bone-age/$PRED/image" -H "Authorization: Bearer $TOKEN")
      WITHOUT=$(curl -s -m 60 -o /dev/null -w '%{http_code}' "$API/bone-age/$PRED/image")
      echo "PASS: image route $WITH with token, $WITHOUT without"
      [ "$WITH" = "200" ] && [ "$WITHOUT" = "401" ] || { echo "FAIL: image route is not guardian-checked"; exit 1; }
      exit 0 ;;
    FAILED*) echo "FAIL: inference failed — $ROW"; exit 1 ;;
  esac
done

echo "FAIL: still PENDING after 60s"
exit 1
