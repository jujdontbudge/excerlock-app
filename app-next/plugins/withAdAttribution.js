const { withInfoPlist, withPodfile } = require("expo/config-plugins");

const META_SKADNETWORK_IDS = ["v9wttpbfk9.skadnetwork", "n38lu8286q.skadnetwork"];

function withAdAttribution(config, { meta } = {}) {
  config = withPodfile(config, (mod) => {
    const hook = "require_relative '../modules/excerlock-tiktok-events/ios/disable-payment-tracking'";
    if (!mod.modResults.contents.includes(hook)) {
      const anchor = 'post_install do |installer|';
      if (!mod.modResults.contents.includes(anchor)) throw new Error('TikTok payment safety patch needs the CocoaPods post_install hook');
      mod.modResults.contents = mod.modResults.contents.replace(anchor, `${anchor}\n    ${hook}\n    excerlock_disable_tiktok_payment_tracking(installer)`);
    }
    return mod;
  });
  return withInfoPlist(config, (mod) => {
    const plist = mod.modResults;
    if (!meta) return mod;
    Object.assign(plist, {
      FacebookAppID: meta.appId,
      FacebookClientToken: meta.clientToken,
      FacebookDisplayName: "ExcerLock",
      FacebookAutoLogAppEventsEnabled: true,
      FacebookAdvertiserIDCollectionEnabled: false,
      FacebookSKAdNetworkReportEnabled: false,
      FBSDKAutoLogMetaDataEnabled: false,
      FBSDKAutoLogProductImprovementEnabled: false,
    });
    const scheme = `fb${meta.appId}`;
    const types = Array.isArray(plist.CFBundleURLTypes) ? plist.CFBundleURLTypes : [];
    if (!types.some((type) => (type.CFBundleURLSchemes || []).includes(scheme)))
      plist.CFBundleURLTypes = [...types, { CFBundleURLSchemes: [scheme] }];
    const items = Array.isArray(plist.SKAdNetworkItems) ? plist.SKAdNetworkItems : [];
    const known = new Set(items.map((item) => String(item.SKAdNetworkIdentifier).toLowerCase()));
    plist.SKAdNetworkItems = [
      ...items,
      ...META_SKADNETWORK_IDS.filter((id) => !known.has(id)).map((id) => ({ SKAdNetworkIdentifier: id })),
    ];
    return mod;
  });
}

module.exports = withAdAttribution;
module.exports.META_SKADNETWORK_IDS = META_SKADNETWORK_IDS;
