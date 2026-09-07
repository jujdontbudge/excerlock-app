Pod::Spec.new do |s|
  s.name = 'ExpoLocalSearch'
  s.version = '1.0.0'
  s.summary = 'On-device Apple Maps place search for ExcerLock'
  s.description = s.summary
  s.license = { :type => 'MIT' }
  s.author = 'ExcerLock'
  s.homepage = 'https://expo.dev'
  s.platforms = { :ios => '17.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'MapKit', 'CoreLocation', 'Contacts'
  s.swift_version = '5.9'
  s.source_files = '**/*.{h,m,mm,swift}'
end
