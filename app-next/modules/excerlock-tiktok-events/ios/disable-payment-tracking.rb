def excerlock_disable_tiktok_payment_tracking(installer)
  source = installer.sandbox.root.join('TikTokBusinessSDK/TikTokBusinessSDK/Core/TikTokBusiness.m')
  original = 'self.paymentTrackingEnabled = globalConfigPaymentTrackingEnabled;'
  replacement = 'self.paymentTrackingEnabled = tiktokConfig.paymentTrackingStatus != TikTokPaymentTrackStatus_disabled && globalConfigPaymentTrackingEnabled;'
  contents = File.read(source)
  raise 'TikTok 1.7.2 payment safety patch no longer matches; review SDK before building' unless contents.include?(original) || contents.include?(replacement)
  unless contents.include?(replacement)
    File.chmod(0644, source)
    File.write(source, contents.sub(original, replacement))
  end
  screenshot_original = 'self.screenshotEnabled = [[businessSDKConfig objectForKey:@"enable_screenshot"] boolValue];'
  screenshot_disabled = 'self.screenshotEnabled = NO; /* ExcerLock: never capture app screens for advertising. */'
  contents = File.read(source)
  raise 'TikTok 1.7.2 screenshot safety patch no longer matches; review SDK before building' unless contents.include?(screenshot_original) || contents.include?(screenshot_disabled)
  unless contents.include?(screenshot_disabled)
    File.chmod(0644, source)
    File.write(source, contents.sub(screenshot_original, screenshot_disabled))
  end
  manifest = installer.sandbox.root.join('TikTokBusinessSDK/PrivacyInfo.xcprivacy')
  privacy = Xcodeproj::Plist.read_from_path(manifest)
  collected = privacy['NSPrivacyCollectedDataTypes']
  if collected.is_a?(Array)
    privacy['NSPrivacyCollectedDataTypes'] = collected.reject { |entry| entry['NSPrivacyCollectedDataType'] == '' }
    privacy.delete('NSPrivacyCollectedDataTypes') if privacy['NSPrivacyCollectedDataTypes'].empty?
    File.chmod(0644, manifest)
    Xcodeproj::Plist.write_to_path(privacy, manifest)
  end
end
