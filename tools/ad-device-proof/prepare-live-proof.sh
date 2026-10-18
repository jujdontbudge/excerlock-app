#!/bin/zsh
set -eu
umask 077
cd "${0:A:h}/../.."
mkdir -p "$HOME/device-test" .excer/device-live-proof
source_file=app-next/modules/excerlock-tiktok-events/ios/ExcerlockTikTokEventsModule.swift
backup_file=$(mktemp .excer/device-live-proof/tiktok-source.XXXXXX)
cp "$source_file" "$backup_file"
trap 'cp "$backup_file" "$source_file"; rm -f "$backup_file"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
python3 - "$source_file" <<'PY'
from pathlib import Path
import hashlib,json,sys
p=Path(sys.argv[1]);s=p.read_text();original_sha256=hashlib.sha256(p.read_bytes()).hexdigest()
anchor='if testMode { config.enableDebugMode() }'
if s.count(anchor)!=1: raise SystemExit('Unrecognized TikTok source; refusing live override')
s=s.replace(anchor, 'NSLog("[ExcerLockAds] tiktok local-live-proof testMode=false appId=%@ tiktokAppId=%@", appStoreId, tiktokAppId)')
p.write_text(s)
(Path.home()/'device-test/live-build-override.json').write_text(json.dumps({'purpose':'one local Release non-test launch after B tests; no purchases','original_sha256':original_sha256,'override':'enableDebugMode call omitted only in staged local binary; source restored on exit'},indent=2))
PY
signing_allowed=YES
if [[ "${1:-}" == --unsigned ]]; then signing_allowed=NO; fi
EXCERLOCK_ENV=preview EAS_BUILD_PROFILE=preview EXPO_PUBLIC_API_URL=https://api.excerlock.com/testflight \
  SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild \
  -workspace app-next/ios/ExcerLock.xcworkspace -scheme ExcerLock -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath .excer/device-build \
  CODE_SIGNING_ALLOWED="$signing_allowed" CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=AX3C2B78YD \
  build > "$HOME/device-test/live-release-build.log" 2>&1
cp -R .excer/device-build/Build/Products/Release-iphoneos/ExcerLock.app .excer/device-live-proof/
cp "$backup_file" "$source_file"
python3 - "$source_file" <<'PY'
from pathlib import Path
import hashlib,json,sys
p=Path.home()/'device-test/live-build-override.json';d=json.loads(p.read_text())
d['restored_source_sha256']=hashlib.sha256(Path(sys.argv[1]).read_bytes()).hexdigest()
d['default_test_mode_guard_restored']='if testMode { config.enableDebugMode() }' in Path(sys.argv[1]).read_text()
p.write_text(json.dumps(d,indent=2))
PY
