Pod::Spec.new do |s|
  s.name = 'ExcerlockStartup'; s.version = '1.0.0'
  s.summary = 'Diagnostic startup signposts for ExcerLock.'
  s.description = 'Process-scoped diagnostic markers from AppDelegate entry to interactive Home.'
  s.author = 'ExcerLock'; s.homepage = 'https://excerlock.com'; s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }; s.source = { :git => '' }; s.static_framework = true
  s.dependency 'ExpoModulesCore'; s.frameworks = 'OSLog'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }; s.source_files = '**/*.swift'
end
