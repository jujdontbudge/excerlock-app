#!/usr/bin/env python3
"""Strict local signed-payload audit. Not proof of store approval/device activation."""
import datetime as dt
import fnmatch
import plistlib
from pathlib import Path
import subprocess
import sys

TEAM = 'AX3C2B78YD'
BUNDLE = 'com.johansardar.excerlock'
GROUP = 'group.' + BUNDLE
EXT_REQUIRED = {'com.apple.developer.family-controls': True, 'com.apple.security.application-groups': [GROUP]}
MAIN_REQUIRED = {**EXT_REQUIRED, 'com.apple.developer.applesignin': ['Default'], 'aps-environment': 'production',
                 'com.apple.developer.associated-domains': ['applinks:excerlock.com']}
SIGNING_KEYS = {'application-identifier', 'com.apple.developer.team-identifier', 'keychain-access-groups',
                'get-task-allow', 'beta-reports-active'}
EXTENSIONS = {
    BUNDLE + '.monitor': ('PlugIns', 'NSExtension', 'NSExtensionPointIdentifier', 'com.apple.deviceactivity.monitor-extension'),
    BUNDLE + '.shield': ('PlugIns', 'NSExtension', 'NSExtensionPointIdentifier', 'com.apple.ManagedSettingsUI.shield-configuration-service'),
    BUNDLE + '.shieldaction': ('PlugIns', 'NSExtension', 'NSExtensionPointIdentifier', 'com.apple.ManagedSettings.shield-action-service'),
    BUNDLE + '.report': ('Extensions', 'EXAppExtensionAttributes', 'EXExtensionPointIdentifier', 'com.apple.deviceactivityui.report-extension'),
}
USAGE_KEYS = ['NSMotionUsageDescription', 'NSCameraUsageDescription', 'NSLocationWhenInUseUsageDescription',
              'NSLocationAlwaysAndWhenInUseUsageDescription', 'NSLocationAlwaysUsageDescription',
              'NSFaceIDUsageDescription',
              'NSPhotoLibraryUsageDescription', 'NSUserTrackingUsageDescription']

def require(condition, message):
    if not condition: raise ValueError(message)

def verify_info(info):
    for key in USAGE_KEYS:
        require(isinstance(info.get(key), str) and bool(info[key].strip()), 'Missing/nonempty usage description: ' + key)
    require(set(info.get('UIBackgroundModes', [])) == {'location', 'fetch'}, 'Incorrect background modes')
    require('en' in info.get('CFBundleLocalizations', []), 'Missing English localization')
    require('CFBundleAlternateIcons' not in info, 'Unexpected alternate icons')
    # No HealthKit (Guideline 2.5.1, ADR 0048): no Health purpose strings.
    for key in ['NSHealthShareUsageDescription', 'NSHealthUpdateUsageDescription', 'NSHealthClinicalHealthRecordsShareUsageDescription']:
        require(key not in info, 'Unexpected Health usage description: ' + key)

def allowed(actual, permitted):
    if isinstance(actual, list):
        if isinstance(permitted, list):
            return all(any(allowed(item, p) for p in permitted) for item in actual)
        # Some App Store profiles authorize every value of a list entitlement
        # with a scalar wildcard (for example Associated Domains = "*").
        return isinstance(permitted, str) and all(allowed(item, permitted) for item in actual)
    if isinstance(actual, str) and isinstance(permitted, str):
        return fnmatch.fnmatchcase(actual, permitted)
    return type(actual) is type(permitted) and actual == permitted

def verify_entitlements(bundle, ent, profile, main=False, distribution=False):
    required = dict(MAIN_REQUIRED if main else EXT_REQUIRED)
    # Development/dev-client and internal preview signatures are valid local
    # evidence; release pipeline must additionally require production signing.
    if main:
        require(ent.get('aps-environment') in ['development', 'production'], 'Invalid push environment')
        required['aps-environment'] = ent['aps-environment']
    if distribution:
        if main:
            require(ent.get('aps-environment') == 'production', 'Distribution main app must use production push')
        require(ent.get('get-task-allow') is not True, 'Distribution bundle must not allow debugging')
        require(not profile.get('ProvisionedDevices'), 'Distribution profile must not contain development/ad hoc devices')
        require(profile.get('ProvisionsAllDevices') is not True, 'Distribution profile must not be enterprise')
        require(profile.get('Entitlements', {}).get('beta-reports-active') is True,
                'Distribution profile missing App Store beta-reports-active entitlement')
    for key, value in required.items():
        require(type(ent.get(key)) is type(value) and ent.get(key) == value, 'Incorrect signed capability: ' + key)
    require(not (set(ent) - set(required) - SIGNING_KEYS), 'Unexpected signed privilege')
    require(ent.get('com.apple.developer.team-identifier') == TEAM, 'Incorrect signed team')
    require(TEAM in profile.get('TeamIdentifier', []), 'Incorrect provisioning team')
    prefixes = profile.get('ApplicationIdentifierPrefix', [])
    require(ent.get('application-identifier') in [p + '.' + bundle for p in prefixes], 'Signature not bound to bundle')
    expiry = profile.get('ExpirationDate')
    require(isinstance(expiry, dt.datetime), 'Provisioning expiry missing')
    if expiry.tzinfo is None: expiry = expiry.replace(tzinfo=dt.timezone.utc)
    require(expiry > dt.datetime.now(dt.timezone.utc), 'Provisioning profile expired')
    provisioned = profile.get('Entitlements', {})
    for key, value in ent.items():
        require(key in provisioned and allowed(value, provisioned[key]), 'Profile does not authorize signed entitlement: ' + key)

def command(args):
    result = subprocess.run(args, capture_output=True, timeout=30)
    require(result.returncode == 0, args[0] + ' verification/decoding failed (output withheld)')
    return result.stdout

def load(path):
    with path.open('rb') as file: return plistlib.load(file)

def verify_bundle(path, bundle, main=False, distribution=False):
    require(path.is_dir() and not path.is_symlink(), 'Missing or linked bundle')
    info = load(path / 'Info.plist')
    require(info.get('CFBundleIdentifier') == bundle, 'Unexpected bundle ID')
    executable = info.get('CFBundleExecutable')
    require(isinstance(executable, str) and '/' not in executable and (path / executable).is_file(), 'Missing bundle executable')
    command(['codesign', '--verify', '--strict', str(path)])
    ent = plistlib.loads(command(['codesign', '-d', '--entitlements', ':-', str(path)]))
    profile_path = path / 'embedded.mobileprovision'
    require(profile_path.is_file(), 'Missing embedded provisioning profile')
    profile = plistlib.loads(command(['security', 'cms', '-D', '-i', str(profile_path)]))
    verify_entitlements(bundle, ent, profile, main=main, distribution=distribution)
    return info

def verify_payload(app, distribution=False):
    info = verify_bundle(app, BUNDLE, main=True, distribution=distribution)
    verify_info(info)
    privacy = load(app / 'PrivacyInfo.xcprivacy')
    require(privacy.get('NSPrivacyTracking') is True, 'Ad attribution tracking must be declared')
    require({'ep1.facebook.com', 'analytics.us.tiktok.com'} <= set(privacy.get('NSPrivacyTrackingDomains', [])),
            'Missing ad attribution tracking domains')
    tracking = {row.get('NSPrivacyCollectedDataType'): row for row in privacy.get('NSPrivacyCollectedDataTypes', [])}
    for kind in ['ProductInteraction', 'DeviceID', 'PurchaseHistory']:
        row = tracking.get('NSPrivacyCollectedDataType' + kind, {})
        require(row.get('NSPrivacyCollectedDataTypeTracking') is True, 'Missing tracking declaration: ' + kind)
        require('NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising' in row.get('NSPrivacyCollectedDataTypePurposes', []),
                'Missing advertising purpose: ' + kind)
    types = {row.get('NSPrivacyCollectedDataType') for row in privacy.get('NSPrivacyCollectedDataTypes', [])}
    require({'NSPrivacyCollectedDataTypeProductInteraction', 'NSPrivacyCollectedDataTypePurchaseHistory',
             'NSPrivacyCollectedDataTypeUserID'} <= types, 'Missing privacy declarations')
    seen = set()
    for directory in ['PlugIns', 'Extensions']:
        for path in (app / directory).glob('*.appex'):
            ext_info = load(path / 'Info.plist')
            bundle = ext_info.get('CFBundleIdentifier')
            require(bundle in EXTENSIONS and bundle not in seen, 'Unexpected or duplicate extension bundle')
            parent, container, key, point = EXTENSIONS[bundle]
            require(parent == directory and ext_info.get(container, {}).get(key) == point, 'Wrong extension packaging/point')
            require(not (container == 'EXAppExtensionAttributes' and 'NSExtension' in ext_info), 'Mixed report packaging')
            verify_bundle(path, bundle, distribution=distribution)
            require(ext_info.get('CFBundleVersion') == info.get('CFBundleVersion'), 'Extension build version mismatch')
            require(ext_info.get('CFBundleShortVersionString') == info.get('CFBundleShortVersionString'), 'Extension marketing version mismatch')
            seen.add(bundle)
    require(seen == set(EXTENSIONS), 'Missing required extensions')
    command(['codesign', '--verify', '--deep', '--strict', str(app)])

if __name__ == '__main__':
    try:
        distribution = len(sys.argv) == 3 and sys.argv[1] == '--distribution'
        require(len(sys.argv) == (3 if distribution else 2),
                'Usage: verify_signed_manifest.py [--distribution] ExcerLock.app')
        verify_payload(Path(sys.argv[2] if distribution else sys.argv[1]), distribution=distribution)
    except Exception as error:
        print('SIGNED MANIFEST FAIL: ' + str(error), file=sys.stderr)
        sys.exit(1)
    print('SIGNED MANIFEST PASS: exact bundles/capability values/provisioning/signatures; device activation unproven')
