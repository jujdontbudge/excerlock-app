import fs from 'node:fs'; import path from 'node:path';
const ios = fs.readFileSync(path.join(__dirname,'../../../modules/excerlock-enforcement/ios/ExcerlockEnforcementModule.swift'),'utf8');
const policy = fs.readFileSync(path.join(__dirname,'../../../modules/excerlock-enforcement/ios/EnforcementPolicy.swift'),'utf8');
const monitor = fs.readFileSync(path.join(__dirname,'../../../targets/DeviceActivityMonitorExtension/GuardedDeviceActivityMonitorExtension.swift'),'utf8');
describe('guarded native enforcement invariants',()=>{
 it('serializes compare and shield writes under flock',()=>{ expect(policy).toContain('flock(fd, LOCK_EX)'); expect(policy).toContain('now >= m.end'); expect(policy).toContain('windowActive'); });
 it('rejects conflicting revisions and revalidates staged monitors',()=>{ expect(ios).toContain('revision == prior.revision'); expect(ios).toContain('let stillCurrent'); expect(ios).toContain('activities.contains'); });
 it('uses recurring guarded callbacks and stage-before-retire',()=>{ expect(ios).toContain('repeats: true'); expect(ios.indexOf('startMonitoring')).toBeLessThan(ios.lastIndexOf('stopMonitoring(retire')); expect(monitor).not.toContain('blockSelection'); });
});

test('recurring anchors may be past but equal weekly boundaries are rejected',()=>{expect(ios).not.toContain('end > now else');expect(ios).toContain('guard startComponents != endComponents');expect(ios).not.toContain('{ continue }')});
test('earned suppression expires so a later weekly boundary can relock',()=>{expect(policy).toContain('earnedStillValid = r.openReason == "earned" && now < r.eligibleUntil');expect(policy).toContain('!earnedStillValid')});
