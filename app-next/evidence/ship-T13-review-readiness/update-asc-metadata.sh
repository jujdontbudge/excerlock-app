#!/bin/bash
set -euo pipefail
APP=6787265352
VERSION_LOC=da0f8b3a-3aaf-425c-be27-45e778151297
APPINFO_LOC=b2d570cb-ce1b-4d5b-b14b-09a068f84985
OUT="$(cd "$(dirname "$0")" && pwd)"
asc apps info view --app "$APP" --include appInfoLocalizations --output json > "$OUT/asc-app-info-before.json"
asc versions list --app "$APP" --platform IOS --include appStoreVersionLocalizations --output json > "$OUT/asc-version-before.json"
asc localizations update --id "$VERSION_LOC" \
  --description "$(cat /tmp/t13-description.txt)" \
  --keywords "$(cat /tmp/t13-keywords.txt)" \
  --promotional-text "$(cat /tmp/t13-promo.txt)" \
  --support-url 'https://excerlock.com/support' \
  --marketing-url 'https://excerlock.com/' --output json > "$OUT/asc-version-update.json"
asc localizations update --type app-info --id "$APPINFO_LOC" \
  --privacy-policy-url 'https://excerlock.com/privacy' --output json > "$OUT/asc-app-info-update.json"
asc apps info view --app "$APP" --include appInfoLocalizations --output json > "$OUT/asc-app-info-after.json"
asc versions list --app "$APP" --platform IOS --include appStoreVersionLocalizations --output json > "$OUT/asc-version-after.json"
for url in https://excerlock.com/ https://excerlock.com/privacy https://excerlock.com/terms https://excerlock.com/support; do
  curl --fail --silent --show-error --location --max-time 20 --output /dev/null --write-out "$url %{http_code} %{content_type}\n" "$url"
done > "$OUT/public-url-readback.txt"
python3 - "$OUT" <<'PY'
import json,sys,urllib.request
out=sys.argv[1]
v=json.load(open(out+'/asc-version-after.json'))
loc=next(x for x in v['included'] if x['type']=='appStoreVersionLocalizations' and x['id']=='da0f8b3a-3aaf-425c-be27-45e778151297')['attributes']
assert loc['supportUrl']=='https://excerlock.com/support'
assert loc['marketingUrl']=='https://excerlock.com/'
assert 'No account. No server' not in loc['description']
assert 'anonymous account' in loc['description']
a=json.load(open(out+'/asc-app-info-after.json'))
aloc=next(x for x in a['included'] if x['id']=='b2d570cb-ce1b-4d5b-b14b-09a068f84985')['attributes']
assert aloc['privacyPolicyUrl']=='https://excerlock.com/privacy'
d=json.load(urllib.request.urlopen('https://excerlock.com/.well-known/apple-app-site-association',timeout=20))
detail=d['applinks']['details'][0]
assert detail['appID']=='AX3C2B78YD.com.johansardar.excerlock'
assert detail['paths']==[], 'AASA scope changed unexpectedly'
print('PASS: ASC metadata canonical and truthful; AASA intentionally authorizes no universal-link paths')
PY
