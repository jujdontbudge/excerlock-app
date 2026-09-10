Pod::Spec.new do |s|
  s.name = 'ExcerlockMotion'
  s.version = '1.0.0'
  s.summary = 'On-device Core Motion activity and cadence bridge for ExcerLock.'
  s.description = 'A local Expo Module that streams CMMotionActivity and CMPedometer observations.'
  s.author = 'ExcerLock'
  s.homepage = 'https://excerlock.com'
  s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }
  s.source = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CoreMotion'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
