import { projectMeasuredHistory } from '../projectMeasuredHistory';import type { Rule } from '../types';import type { GymInterval } from '../gymMachine';
const rule:Rule={id:'r',activity:'walking',mode:{kind:'target',activity:'walking',metric:'steps',goal:100},schedule:{days:[2],window:{kind:'allDay'}},enabled:true,createdAt:'',updatedAt:''};
test('projects measured steps with null usage and domain scheduled/met facts',()=>{expect(projectMeasuredHistory({'2026-09-08':120},[],[],[rule],[{ruleId:'r',day:'2026-09-08',progress:120,met:true,metAt:'2026-09-08T12:00:00Z'}],'UTC','2026-09-08T20:00:00Z')).toEqual([{day:'2026-09-08',usageMinutes:null,activity:{walking:120,gym:0},scheduled:true,met:true}])});
test('unions overlapping confirmed gym dwell and splits local days',()=>{const intervals:GymInterval[]=[{id:'a',regionId:'a',enteredAt:0,confirmedAt:Date.parse('2026-09-09T04:30Z'),exitedAt:Date.parse('2026-09-09T05:30Z')},{id:'b',regionId:'b',enteredAt:0,confirmedAt:Date.parse('2026-09-09T05:00Z'),exitedAt:Date.parse('2026-09-09T06:00Z')}];const rows=projectMeasuredHistory({},intervals,['a','b'],[],[],'America/Chicago','2026-09-09T07:00Z');expect(rows.map(r=>[r.day,r.activity.gym])).toEqual([['2026-09-08',30],['2026-09-09',60]])});
test('deleted regions and missing measurements fabricate nothing',()=>{const interval:GymInterval={id:'a',regionId:'deleted',enteredAt:0,confirmedAt:1,exitedAt:60001};expect(projectMeasuredHistory({},[interval],[],[],[],'UTC','2026-09-09T00:00Z')).toEqual([{day:'2026-09-09',usageMinutes:null,activity:{walking:0,gym:0},scheduled:false,met:false}])});

test('does not reevaluate sealed dates and bounds stale activity to 400 days', () => {
  const history = projectMeasuredHistory({'2000-01-01':1}, [], [], [], [], 'UTC', '2026-09-10T12:00Z');
  expect(history).toHaveLength(400);
  const skipped = projectMeasuredHistory({'2026-09-08':1}, [], [], [rule], [], 'UTC', '2026-09-10T12:00Z', new Set(['2026-09-08','2026-09-09']));
  expect(skipped.map(row=>row.day)).toEqual(['2026-09-10']);
});
