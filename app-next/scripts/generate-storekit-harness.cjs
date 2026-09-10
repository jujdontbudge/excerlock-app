#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const xcode = require('xcode');

const TARGET = 'ExcerLockStoreKitUITests';
const BUNDLE_ID = 'com.johansardar.excerlock.storekit-uitests';
const PRODUCT_TYPE = 'com.apple.product-type.bundle.ui-testing';
const FRAMEWORK = 'StoreKitTest.framework';
const SOURCE_FILES = ['ExcerLock.storekit', `${TARGET}.swift`, `${TARGET}-Info.plist`];
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
function readOwnedFile(source, destination, label) {
  if (!fs.existsSync(source)) fail(`missing harness source ${source}`);
  if (!fs.existsSync(destination)) return;
  if (!fs.statSync(destination).isFile() || fs.readFileSync(destination, 'utf8') !== fs.readFileSync(source, 'utf8')) {
    fail(`existing ${label} is not owned by this generator`);
  }
}
function preflightGeneratedSources(sourceRoot, generated) {
  if (fs.existsSync(generated) && !fs.statSync(generated).isDirectory()) fail(`existing ${generated} is not a directory`);
  for (const name of SOURCE_FILES) readOwnedFile(path.join(sourceRoot, name), path.join(generated, name), `${TARGET}/${name}`);
}
function preflightSchemeDirectory(schemeDir) {
  const sharedData = path.dirname(schemeDir);
  if (fs.existsSync(sharedData) && !fs.statSync(sharedData).isDirectory()) {
    fail(`existing ${sharedData} is not a directory`);
  }
  if (fs.existsSync(schemeDir) && !fs.statSync(schemeDir).isDirectory()) {
    fail(`existing ${schemeDir} is not a directory`);
  }
}
function enableEmbeddedDebugBundle(project, app) {
  const phases = project.hash.project.objects.PBXShellScriptBuildPhase ?? {};
  const appPhaseIds = new Set((app.value.buildPhases ?? []).map(phase => phase.value));
  const matches = Object.entries(phases).filter(([uuid, phase]) =>
    !uuid.endsWith('_comment') && appPhaseIds.has(uuid) && unquote(phase.name) === 'Bundle React Native code and images');
  if (matches.length !== 1) fail(`expected exactly one main-app React Native bundle phase, found ${matches.length}`);
  const phase = matches[0][1];
  const skip = 'export SKIP_BUNDLING=1';
  const force = 'export FORCE_BUNDLING=1';
  const skipCount = String(phase.shellScript).split(skip).length - 1;
  const forceCount = String(phase.shellScript).split(force).length - 1;
  if (skipCount === 1 && forceCount === 0) phase.shellScript = phase.shellScript.replace(skip, force);
  else if (skipCount !== 0 || forceCount !== 1) fail('unexpected Debug bundling stanza in main-app React Native bundle phase');
}
function writeOwnedScheme(file, contents) {
  if (fs.existsSync(file) && fs.readFileSync(file, 'utf8') !== contents) {
    fail('existing ExcerLock-StoreKit scheme is not owned by this generator');
  }
  fs.writeFileSync(file, contents);
}
function targetBuildPhase(project, target, isa, name) {
  const section = project.hash.project.objects[isa] ?? {};
  const matches = (target.value.buildPhases ?? []).filter((item) => {
    if (!item?.value || item.value.endsWith('_comment')) return false;
    const phase = section[item.value];
    return phase && (item.comment === name || unquote(phase.name) === name);
  });
  if (matches.length > 1) fail(`existing ${target.value.name} has duplicate ${name} phases`);
  return matches.length === 1 ? section[matches[0].value] : null;
}
function ensureTargetBuildPhases(project, target) {
  for (const [isa, name] of [
    ['PBXSourcesBuildPhase', 'Sources'],
    ['PBXResourcesBuildPhase', 'Resources'],
    ['PBXFrameworksBuildPhase', 'Frameworks'],
  ]) {
    if (!targetBuildPhase(project, target, isa, name)) project.addBuildPhase([], isa, name, target.uuid);
  }
}
function removeAddedAppDependency(project, app, test, existingIds) {
  const dependencies = project.hash.project.objects.PBXTargetDependency ?? {};
  const proxies = project.hash.project.objects.PBXContainerItemProxy ?? {};
  app.value.dependencies = (app.value.dependencies ?? []).filter((item) => {
    if (!item?.value || existingIds.has(item.value)) return true;
    const dependency = dependencies[item.value];
    if (!dependency || dependency.target !== test.uuid) return true;
    delete dependencies[item.value];
    delete dependencies[`${item.value}_comment`];
    if (dependency.targetProxy) {
      delete proxies[dependency.targetProxy];
      delete proxies[`${dependency.targetProxy}_comment`];
    }
    return false;
  });
}
function hasTargetDependency(project, source, targetUuid) {
  const dependencies = project.hash.project.objects.PBXTargetDependency ?? {};
  return (source.value.dependencies ?? []).some((item) => dependencies[item.value]?.target === targetUuid);
}
function frameworkReference(project) {
  const references = project.pbxFileReferenceSection();
  return Object.entries(references).find(([key, value]) =>
    !key.endsWith('_comment') && (unquote(value.name) === FRAMEWORK || unquote(value.path) === `System/Library/Frameworks/${FRAMEWORK}`)
  );
}
function ensureStoreKitFramework(project, target) {
  const phase = targetBuildPhase(project, target, 'PBXFrameworksBuildPhase', 'Frameworks');
  if (!phase) fail(`UI-test Frameworks phase missing for ${TARGET}`);
  const buildFiles = project.pbxBuildFileSection();
  const existing = frameworkReference(project);
  if (!existing) {
    project.addFramework(FRAMEWORK, { target: target.uuid });
    return;
  }
  const fileRef = existing[0];
  const linked = Object.entries(buildFiles).find(([key, value]) =>
    !key.endsWith('_comment') && value.fileRef === fileRef && phase.files?.some((item) => item.value === key)
  );
  if (linked) return;
  const buildUuid = project.generateUuid();
  buildFiles[buildUuid] = { isa: 'PBXBuildFile', fileRef, fileRef_comment: FRAMEWORK };
  buildFiles[`${buildUuid}_comment`] = `${FRAMEWORK} in Frameworks`;
  phase.files = [...(phase.files ?? []), { value: buildUuid, comment: `${FRAMEWORK} in Frameworks` }];
}
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
  const storeKit = `<StoreKitConfigurationFileReference identifier = "../../../ExcerLockStoreKitUITests/ExcerLock.storekit"></StoreKitConfigurationFileReference>`;
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
  preflightGeneratedSources(sourceRoot, generated);
  const schemeDir = path.join(iosRoot, 'ExcerLock.xcodeproj', 'xcshareddata', 'xcschemes');
  const schemeFile = path.join(schemeDir, 'ExcerLock-StoreKit.xcscheme');
  preflightSchemeDirectory(schemeDir);
  const project = xcode.project(projectFile);
  project.parseSync();
  const app = findNativeTarget(project, 'ExcerLock');
  if (!app) fail('main app target not found');
  let test = findNativeTarget(project, TARGET);
  if (!test) {
    if (fs.existsSync(schemeFile)) fail(`existing ${path.basename(schemeFile)} is not owned by this generator`);
    const appDependencyIds = new Set((app.value.dependencies ?? []).map((item) => item.value));
    const added = project.addTarget(TARGET, 'unit_test_bundle', TARGET, BUNDLE_ID);
    test = { uuid: added.uuid, value: added.pbxNativeTarget };
    test.value.productType = `"${PRODUCT_TYPE}"`;
    removeAddedAppDependency(project, app, test, appDependencyIds);
    const group = project.addPbxGroup([], TARGET, TARGET);
    project.addToPbxGroup(group.uuid, project.getFirstProject().firstProject.mainGroup);
    if (!project.pbxGroupByName('Resources')) {
      const resources = project.addPbxGroup([], 'Resources', 'Resources');
      project.addToPbxGroup(resources.uuid, project.getFirstProject().firstProject.mainGroup);
    }
    ensureTargetBuildPhases(project, test);
    project.addSourceFile(`${TARGET}.swift`, { target: test.uuid }, group.uuid);
    project.addResourceFile('ExcerLock.storekit', { target: test.uuid }, group.uuid);
    project.addTargetDependency(test.uuid, [app.uuid]);
  } else {
    if (unquote(test.value.productType) !== PRODUCT_TYPE) fail(`existing ${TARGET} has unexpected product type`);
    const existingList = project.pbxXCConfigurationList()[test.value.buildConfigurationList];
    const existingConfigs = project.pbxXCBuildConfigurationSection();
    const owned = existingList?.buildConfigurations?.every(item =>
      unquote(existingConfigs[item.value]?.buildSettings?.EXCERLOCK_STOREKIT_HARNESS) === '1');
    if (!owned) fail(`existing ${TARGET} is not owned by this generator`);
    const existingScheme = fs.existsSync(schemeFile) ? fs.readFileSync(schemeFile, 'utf8') : null;
    if (existingScheme !== null && existingScheme !== scheme(app, test))
      fail(`existing ${path.basename(schemeFile)} is not owned by this generator`);
    ensureTargetBuildPhases(project, test);
    if (!hasTargetDependency(project, test, app.uuid)) project.addTargetDependency(test.uuid, [app.uuid]);
  }
  const expectedScheme = scheme(app, test);
  if (fs.existsSync(schemeFile) && fs.readFileSync(schemeFile, 'utf8') !== expectedScheme)
    fail(`existing ${path.basename(schemeFile)} is not owned by this generator`);
  ensureStoreKitFramework(project, test);
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
    config.buildSettings.EXCERLOCK_STOREKIT_HARNESS = '1';
    config.buildSettings.INFOPLIST_FILE = `"${TARGET}/${TARGET}-Info.plist"`;
  }
  enableEmbeddedDebugBundle(project, app);
  fs.mkdirSync(generated, { recursive: true });
  for (const name of SOURCE_FILES) fs.copyFileSync(path.join(sourceRoot, name), path.join(generated, name));
  fs.writeFileSync(projectFile, project.writeSync());
  fs.mkdirSync(schemeDir, { recursive: true });
  writeOwnedScheme(schemeFile, expectedScheme);
  console.log(`Generated Debug-only StoreKit harness in ${iosRoot}`);
}
if (require.main === module) main();
module.exports = {
  enableEmbeddedDebugBundle,
  ensureStoreKitFramework,
  ensureTargetBuildPhases,
  expected,
  preflightGeneratedSources,
  preflightSchemeDirectory,
  scheme,
  validateCatalog,
  writeOwnedScheme,
};
