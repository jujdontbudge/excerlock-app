Pod::Spec.new do |s|
  s.name = 'ExcerlockResidency'
  s.version = '1.0.0'
  s.summary = 'Keeps ExcerLock relaunchable by Core Location during a walking Condition.'
  s.description = 'Holds live location updates and an Always service session, and retakes them first thing on every launch.'
  s.author = 'ExcerLock'
  s.homepage = 'https://excerlock.com'
  s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreLocation'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.swift'
end
