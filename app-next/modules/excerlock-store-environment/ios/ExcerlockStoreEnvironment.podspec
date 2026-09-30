Pod::Spec.new do |s|
  s.name = 'ExcerlockStoreEnvironment'; s.version = '1.0.0'
  s.summary = 'Verified App Store transaction environment for ExcerLock.'
  s.description = 'Reads StoreKit AppTransaction environment without granting subscription access.'
  s.author = 'ExcerLock'; s.homepage = 'https://excerlock.com'; s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }; s.source = { :git => '' }; s.static_framework = true
  s.dependency 'ExpoModulesCore'; s.frameworks = 'StoreKit'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }; s.source_files = '**/*.swift'
end
