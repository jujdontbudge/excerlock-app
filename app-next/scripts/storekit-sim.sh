#!/usr/bin/env bash
set -euo pipefail

app="$(cd "$(dirname "$0")/.." && pwd)"
ios="$app/ios"
scheme="$ios/ExcerLock.xcodeproj/xcshareddata/xcschemes/ExcerLock.xcscheme"
sim="${EXCER_SIM:-ExcerLock-Next}"

[ -f "$scheme" ] || { echo "Run iOS prebuild and pod install first." >&2; exit 1; }

for dir in "$ios/storekit" "$ios/ExcerLock.xcodeproj/storekit"; do
  mkdir -p "$dir"
  cp "$app/storekit/ExcerLock.storekit" "$dir/"
done

if ! grep -q StoreKitConfigurationFileReference "$scheme"; then
  python3 - "$scheme" <<'EOF'
import sys
path = sys.argv[1]
text = open(path).read()
reference = '''      <StoreKitConfigurationFileReference
         identifier = "../../storekit/ExcerLock.storekit">
      </StoreKitConfigurationFileReference>
   </LaunchAction>'''
open(path, 'w').write(text.replace('   </LaunchAction>', reference, 1))
EOF
fi

osascript - "$ios/ExcerLock.xcworkspace" "$sim" <<'EOF'
on run argv
  tell application "Xcode"
    set ws to open (item 1 of argv)
    set waited to 0
    repeat until (loaded of ws) or waited > 120
      delay 1
      set waited to waited + 1
    end repeat
    set active scheme of ws to scheme "ExcerLock" of ws
    set destinations to (run destinations of ws whose name contains (item 2 of argv))
    if (count of destinations) = 0 then error "No run destination named " & (item 2 of argv)
    set active run destination of ws to item 1 of destinations
    run ws
  end tell
end run
EOF
echo "Xcode is launching ExcerLock on $sim with the local StoreKit store."
