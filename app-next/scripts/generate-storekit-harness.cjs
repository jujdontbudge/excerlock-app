#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const xcode = require('xcode');

const TARGET = 'ExcerLockStoreKitUITests';
const BUNDLE_ID = 'com.johansardar.excerlock.storekit-uitests';
const PRODUCT_TYPE = 'com.apple.product-type.bundle.ui-testing';
const expected = new Map([
  ['com.johansardar.excerlock.premium.a.monthly', ['9.99', 'P1M', false]],
  ['com.johansardar.excerlock.premium.a.annual', ['59.99', 'P1Y', true]],
  ['com.johansardar.excerlock.premium.a.winback.annual', ['29.99', 'P1Y', true]],
  ['com.johansardar.excerlock.premium.b.monthly', ['12.99', 'P1M', false]],
  ['com.johansardar.excerlock.premium.b.annual', ['79.99', 'P1Y', true]],
  ['com.johansardar.excerlock.premium.b.winback.annual', ['39.99', 'P1Y', true]],
]);
function fail(message) { throw new Error(`StoreKit harness: ${message}`); }
function unquote(value) { return String(value ?? '').replace(/^"|"$/g, ''); }
function validateCatalog(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const products = (data.subscriptionGroups ?? []).flatMap(group => group.subscriptions ?? []);
  if (products.length !== expected.size) fail(`expected exactly ${expected.size} subscriptions`);
  for (const product of products) {
    const contract = expected.get(product.productID);
    if (!contract) fail(`unexpected product ${product.productID}`);
    const [price, period, trial] = contract;
    const hasTrial = product.introductoryOffer?.paymentMode === 'free' && product.introductoryOffer?.subscriptionPeriod === 'P1W' && product.introductoryOffer?.numberOfPeriods === 1;
    if (product.displayPrice !== price || product.recurringSubscriptionPeriod !== period || hasTrial !== trial) fail(`catalog mismatch for ${product.productID}`);
  }
  if (new Set(products.map(product => product.productID)).size !== expected.size) fail('duplicate product identifier');
}
function findNativeTarget(project, name) {
  const section = project.pbxNativeTargetSection();
  for (const [uuid, value] of Object.entries(section)) {
    if (!uuid.endsWith('_comment') && unquote(value.name) === name) return { uuid, value };
  }
  return null;
}
function buildable(uuid, product, name) {
  return `<BuildableReference BuildableIdentifier = "primary" BlueprintIdentifier = "${uuid}" BuildableName = "${product}" BlueprintName = "${name}" ReferencedContainer = "container:ExcerLock.xcodeproj"></BuildableReference>`;
}
function scheme(app, test) {
  const appRef = buildable(app.uuid, 'ExcerLock.app', 'ExcerLock');
  const testRef = buildable(test.uuid, `${TARGET}.xctest`, TARGET);
  const storeKit = `<StoreKitConfigurationFileReference identifier = "../../ExcerLockStoreKitUITests/ExcerLock.storekit"></StoreKitConfigurationFileReference>`;
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Scheme LastUpgradeVersion="2640" version="1.7">\n<BuildAction parallelizeBuildables="YES" buildImplicitDependencies="YES"><BuildActionEntries><BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="NO">${appRef}</BuildActionEntry><BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="NO">${testRef}</BuildActionEntry></BuildActionEntries></BuildAction>\n<TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES"><Testables><TestableReference skipped="NO">${testRef}</TestableReference></Testables>${storeKit}</TestAction>\n<LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.DebuggerFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">${appRef}</BuildableProductRunnable>${storeKit}</LaunchAction>\n<AnalyzeAction buildConfiguration="Debug"></AnalyzeAction>\n</Scheme>\n`;
}
function main() {
  const appRoot = path.resolve(__dirname, '..');
  const iosRoot = path.resolve(process.argv[2] ?? path.join(appRoot, 'ios'));
  const sourceRoot = path.join(appRoot, 'storekit');
  const projectFile = path.join(iosRoot, 'ExcerLock.xcodeproj', 'project.pbxproj');
  if (!fs.existsSync(projectFile)) fail(`missing generated project ${projectFile}; run Expo prebuild first`);
  validateCatalog(path.join(sourceRoot, 'ExcerLock.storekit'));
  const generated = path.join(iosRoot, TARGET);
  fs.mkdirSync(generated, { recursive: true });
  for (const name of ['ExcerLock.storekit', `${TARGET}.swift`, `${TARGET}-Info.plist`]) {
    fs.copyFileSync(path.join(sourceRoot, name), path.join(generated, name));
  }
  const project = xcode.project(projectFile);
  project.parseSync();
  const app = findNativeTarget(project, 'ExcerLock');
  if (!app) fail('main app target not found');
  let test = findNativeTarget(project, TARGET);
  if (!test) {
    const added = project.addTarget(TARGET, 'unit_test_bundle', TARGET, BUNDLE_ID);
    test = { uuid: added.uuid, value: added.pbxNativeTarget };
    test.value.productType = `"${PRODUCT_TYPE}"`;
    const group = project.addPbxGroup([], TARGET, TARGET);
    project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup);
    if (!project.pbxGroupByName('Resources')) {
      const resources = project.addPbxGroup([], 'Resources', 'Resources');
      project.addToPbxGroup(resources.uuid, project.getFirstProject().firstProject.mainGroup);
    }
    project.addSourceFile(`${TARGET}.swift`, { target: test.uuid }, group.uuid);
    project.addResourceFile('ExcerLock.storekit', { target: test.uuid }, group.uuid);
    project.addTargetDependency(test.uuid, [app.uuid]);
  } else if (unquote(test.value.productType) !== PRODUCT_TYPE) {
    fail(`existing ${TARGET} has unexpected product type`);
  }
  const lists = project.pbxXCConfigurationList();
  const configs = project.pbxXCBuildConfigurationSection();
  const list = lists[test.value.buildConfigurationList];
  if (!list) fail('UI-test configuration list missing');
  for (const item of list.buildConfigurations) {
    const config = configs[item.value];
    if (!config) fail('UI-test build configuration missing');
    config.buildSettings.TEST_TARGET_NAME = 'ExcerLock';
    config.buildSettings.TARGETED_DEVICE_FAMILY = '1';
    config.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '17.4';
    config.buildSettings.SWIFT_VERSION = '5.0';
    config.buildSettings.CODE_SIGN_STYLE = 'Automatic';
    config.buildSettings.INFOPLIST_FILE = `"${TARGET}/${TARGET}-Info.plist"`;
  }
  const projectText = project.writeSync().replaceAll('SKIP_BUNDLING', 'FORCE_BUNDLING');
  fs.writeFileSync(projectFile, projectText);
  const schemeDir = path.join(iosRoot, 'ExcerLock.xcodeproj', 'xcshareddata', 'xcschemes');
  fs.mkdirSync(schemeDir, { recursive: true });
  fs.writeFileSync(path.join(schemeDir, 'ExcerLock-StoreKit.xcscheme'), scheme(app, test));
  console.log(`Generated Debug-only StoreKit harness in ${iosRoot}`);
}
if (require.main === module) main();
module.exports = { expected, scheme, validateCatalog };
