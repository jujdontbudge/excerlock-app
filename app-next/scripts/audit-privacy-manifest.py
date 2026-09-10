#!/usr/bin/env python3
import plistlib, pathlib, sys
p=pathlib.Path(__file__).parents[1]/'privacy'/'PrivacyInfo.xcprivacy'
d=plistlib.loads(p.read_bytes())
assert d.get('NSPrivacyTracking') is False
rows={x['NSPrivacyCollectedDataType']:x for x in d['NSPrivacyCollectedDataTypes']}
expected={
'NSPrivacyCollectedDataTypeProductInteraction':(True,{'NSPrivacyCollectedDataTypePurposeAnalytics'}),
'NSPrivacyCollectedDataTypeCrashData':(False,{'NSPrivacyCollectedDataTypePurposeAppFunctionality'}),
'NSPrivacyCollectedDataTypePerformanceData':(False,{'NSPrivacyCollectedDataTypePurposeAppFunctionality'}),
'NSPrivacyCollectedDataTypeDeviceID':(True,{'NSPrivacyCollectedDataTypePurposeAnalytics','NSPrivacyCollectedDataTypePurposeAppFunctionality'}),
'NSPrivacyCollectedDataTypePurchaseHistory':(True,{'NSPrivacyCollectedDataTypePurposeAppFunctionality'}),
'NSPrivacyCollectedDataTypeUserID':(True,{'NSPrivacyCollectedDataTypePurposeAnalytics','NSPrivacyCollectedDataTypePurposeAppFunctionality'}),}
assert set(rows)==set(expected), f'types differ: {set(rows)^set(expected)}'
for k,(linked,purposes) in expected.items():
 r=rows[k]; assert r['NSPrivacyCollectedDataTypeLinked'] is linked, k
 assert r['NSPrivacyCollectedDataTypeTracking'] is False, k
 assert set(r['NSPrivacyCollectedDataTypePurposes'])==purposes, k
print(f'PASS: {p} has six reviewed non-tracking declarations; linked analytics is explicit')
