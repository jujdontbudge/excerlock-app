Pod::Spec.new do |s|
  s.name = 'ExcerlockMetaEvents'; s.version = '1.0.0'
  s.summary = 'Meta App Events for ExcerLock ad measurement.'
  s.description = 'Starts the Facebook iOS SDK only when the build carries a Meta App ID and logs the reviewed ad events.'
  s.author = 'ExcerLock'; s.homepage = 'https://excerlock.com'; s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }; s.source = { :git => '' }; s.static_framework = true
  s.dependency 'ExpoModulesCore'; s.dependency 'FBSDKCoreKit', '18.1.1'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }; s.source_files = '**/*.swift'
end
