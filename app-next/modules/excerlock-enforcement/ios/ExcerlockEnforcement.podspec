Pod::Spec.new do |s|
  s.name = 'ExcerlockEnforcement'
  s.version = '1.0.0'
  s.summary = 'Serialized native Screen Time enforcement policy for ExcerLock.'
  s.description = 'Shares coherent guarded policy with the DeviceActivity monitor extension.'
  s.author = 'ExcerLock'
  s.homepage = 'https://excerlock.com'
  s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '17.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'DeviceActivity', 'FamilyControls', 'ManagedSettings'
  trace_enabled = ENV['EXCERLOCK_LINKED_RECORDER_TRACE'] == '1'
  trace_condition = trace_enabled ? ' EXCERLOCK_LINKED_RECORDER_TRACE' : ''
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => '$(inherited)' + trace_condition
  }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
  s.exclude_files = 'LinkedTraceWriter.swift' unless trace_enabled
end
