import copy
import datetime as dt
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('verify_signed_manifest', Path(__file__).with_name('verify_signed_manifest.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class SignedManifestTests(unittest.TestCase):
    def fixture(self, main=True, distribution=False):
        bundle = module.BUNDLE if main else module.BUNDLE + '.report'
        ent = dict(module.MAIN_REQUIRED if main else module.EXT_REQUIRED)
        ent.update({'application-identifier': module.TEAM + '.' + bundle, 'com.apple.developer.team-identifier': module.TEAM, 'get-task-allow': False})
        profile = {'TeamIdentifier': [module.TEAM], 'ApplicationIdentifierPrefix': [module.TEAM],
                   'ExpirationDate': dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=1), 'Entitlements': copy.deepcopy(ent)}
        if distribution:
            profile['Entitlements']['beta-reports-active'] = True
        return bundle, ent, profile

    def test_valid_exact_signed_capabilities(self):
        for main in [True, False]:
            module.verify_entitlements(*self.fixture(main), main=main)

    def test_false_family_controls_rejected(self):
        bundle, ent, profile = self.fixture()
        ent['com.apple.developer.family-controls'] = False
        with self.assertRaises(ValueError): module.verify_entitlements(bundle, ent, profile, main=True)

    def test_profile_must_authorize_values_not_merely_decode(self):
        bundle, ent, profile = self.fixture()
        profile['Entitlements']['com.apple.developer.family-controls'] = False
        with self.assertRaises(ValueError): module.verify_entitlements(bundle, ent, profile, main=True)

    def test_scalar_profile_wildcard_authorizes_list_entitlement(self):
        bundle, ent, profile = self.fixture()
        profile['Entitlements']['com.apple.developer.associated-domains'] = '*'
        module.verify_entitlements(bundle, ent, profile, main=True)

    def test_wrong_group_and_extra_group_rejected(self):
        for groups in [['group.other'], [module.GROUP, 'group.other']]:
            bundle, ent, profile = self.fixture(False)
            ent['com.apple.security.application-groups'] = groups
            with self.assertRaises(ValueError): module.verify_entitlements(bundle, ent, profile, main=False)

    def test_wrong_team_bundle_and_expired_profile_rejected(self):
        for field in ['team', 'bundle', 'expired']:
            bundle, ent, profile = self.fixture()
            if field == 'team': profile['TeamIdentifier'] = ['OTHER']
            if field == 'bundle': ent['application-identifier'] += '.wrong'
            if field == 'expired': profile['ExpirationDate'] = dt.datetime(2020, 1, 1)
            with self.assertRaises(ValueError): module.verify_entitlements(bundle, ent, profile, main=True)

    def test_main_only_and_unexpected_privilege_rejected(self):
        for key in ['com.apple.developer.healthkit.background-delivery', 'com.apple.developer.siri']:
            bundle, ent, profile = self.fixture(False)
            ent[key] = True
            with self.assertRaises(ValueError): module.verify_entitlements(bundle, ent, profile, main=False)

    def test_profile_push_mode_and_debug_must_match(self):
        for key, value in [('aps-environment', 'development'), ('get-task-allow', True)]:
            bundle, ent, profile = self.fixture()
            profile['Entitlements'][key] = value
            with self.assertRaises(ValueError): module.verify_entitlements(bundle, ent, profile, main=True)

    def test_distribution_requires_app_store_profile_and_production_push(self):
        for main in [True, False]:
            module.verify_entitlements(*self.fixture(main, distribution=True), main=main, distribution=True)
        mutations = [
            ('push', lambda ent, profile: ent.__setitem__('aps-environment', 'development')),
            ('debug', lambda ent, profile: ent.__setitem__('get-task-allow', True)),
            ('devices', lambda ent, profile: profile.__setitem__('ProvisionedDevices', ['device-id'])),
            ('enterprise', lambda ent, profile: profile.__setitem__('ProvisionsAllDevices', True)),
            ('not-app-store', lambda ent, profile: profile['Entitlements'].pop('beta-reports-active')),
        ]
        for name, mutate in mutations:
            bundle, ent, profile = self.fixture(main=True, distribution=True)
            mutate(ent, profile)
            with self.subTest(name=name), self.assertRaises(ValueError):
                module.verify_entitlements(bundle, ent, profile, main=True, distribution=True)

    def test_signed_payload_plist_is_checked_not_generated_project(self):
        good = {key: 'Permission explanation' for key in module.USAGE_KEYS}
        good.update({'UIBackgroundModes': ['location', 'fetch'], 'CFBundleLocalizations': ['en']})
        module.verify_info(good)
        for mutation in [{'NSCameraUsageDescription': ''}, {'UIBackgroundModes': ['processing']}, {'NSUserTrackingUsageDescription': 'unexpected'}]:
            with self.assertRaises(ValueError): module.verify_info({**good, **mutation})

if __name__ == '__main__': unittest.main()
