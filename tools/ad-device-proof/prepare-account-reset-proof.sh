#!/bin/zsh
set -eu
umask 077
cd "${0:A:h}/../.."
# Explicit owner authorization and verified app/group backups are prerequisites.
[[ "${EXCER_OWNER_SIGNOUT_AUTHORIZED:-}" == 1 && "${EXCER_OWNER_BACKUP_VERIFIED:-}" == 1 ]] || exit 2
source_file=app-next/src/packages/settings/RecoveryScreen.tsx
backup_file=$(mktemp .excer/account-reset-source.XXXXXX)
cp "$source_file" "$backup_file"
restore_source() { cp "$backup_file" "$source_file"; rm -f "$backup_file"; }
trap restore_source EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
python3 - "$source_file" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text();anchor='      <SettingsGroup>'
assert s.count(anchor)==1
s=s.replace(anchor, '''      <SecondaryButton label="Owner-authorized test sign-out" onPress={() => {
        void runtime.auth.signOut().then(onBack).catch(() => notify(c.error));
      }} />
'''+anchor)
p.write_text(s)
PY
tools/ad-device-proof/prepare-preview-proof.sh
mkdir -p .excer/device-account-reset-proof
ditto .excer/device-preview-proof/ExcerLock.app .excer/device-account-reset-proof/ExcerLock.app
