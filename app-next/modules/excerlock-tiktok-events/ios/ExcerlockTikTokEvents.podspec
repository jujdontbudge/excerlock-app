Pod::Spec.new do |s|
  s.name = 'ExcerlockTikTokEvents'; s.version = '1.0.0'
  s.summary = 'TikTok App Events for ExcerLock ad measurement.'
  s.description = 'Starts the TikTok Business SDK with payment tracking off and logs the reviewed ad events.'
  s.author = 'ExcerLock'; s.homepage = 'https://excerlock.com'; s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }; s.source = { :git => '' }; s.static_framework = true
  s.dependency 'ExpoModulesCore'; s.dependency 'TikTokBusinessSDK', '1.7.2'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }; s.source_files = '**/*.swift'
end
