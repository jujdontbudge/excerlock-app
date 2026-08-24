Pod::Spec.new do |s|
  s.name = 'ExcerlockGaitVision'
  s.version = '1.0.0'
  s.summary = 'On-device body-pose bridge for ExcerLock treadmill verification.'
  s.description = 'A local Expo Module that streams in-memory Vision shoulder and hip landmarks.'
  s.author = 'ExcerLock'
  s.homepage = 'https://excerlock.com'
  s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }
  s.source = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'Vision'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
