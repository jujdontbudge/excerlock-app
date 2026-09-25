import { addDays, dayKey, resolveLocalInstant } from './calendar';
import type { Rule } from '../model/types';
export type NativeScheduleWindow = Readonly<{ id: string; start: number; end: number }>;
export type ScheduleWindowPlan = { ok: true; windows: NativeScheduleWindow[] } |
  { ok: false; reason: 'nativeWindowLimit' | 'nativeAnchorUnavailable'; required: number };
export type ScheduleIssue = Pick<Extract<ScheduleWindowPlan, { ok: false }>, 'reason' | 'required'>;
const WEEK=7*1440;
export function planScheduleWindows(rules: readonly Rule[], now: string, timezone: string, limit=7): ScheduleWindowPlan {
 const spans:{start:number;end:number}[]=[];
 for(const rule of rules){if(!rule.enabled)continue;const w=rule.schedule.window;for(const day of rule.schedule.days){const start=w.kind==='allDay'?0:w.startMinute,end=w.kind==='allDay'?1440:w.endMinute;if(w.kind==='range'&&end<=start)spans.push({start:day*1440+start,end:(day+1)*1440+end});else spans.push({start:day*1440+start,end:day*1440+end});}}
 const wrapped=spans.flatMap(s=>s.end>WEEK?[{start:s.start,end:WEEK},{start:0,end:s.end-WEEK}]:[s]);
 const normalized=wrapped.flatMap(span=>{const parts:{start:number;end:number}[]=[];let start=span.start;while(start<span.end){const midnight=Math.min(span.end,(Math.floor(start/1440)+1)*1440);parts.push({start,end:midnight});start=midnight;}return parts;}).sort((a,b)=>a.start-b.start);
 const merged:{start:number;end:number}[]=[];for(const span of normalized){const last=merged.at(-1);const sameDay=last&&Math.floor(span.start/1440)===Math.floor((last.end-1)/1440);if(last&&sameDay&&span.start<=last.end)last.end=Math.max(last.end,span.end);else merged.push({...span});}
 if(merged.length>limit)return{ok:false,reason:'nativeWindowLimit',required:merged.length};
 const today=dayKey(now,timezone);
 const names=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const name=new Intl.DateTimeFormat('en-US',{timeZone:timezone,weekday:'short'}).format(new Date(now));const sunday=addDays(today,-names.indexOf(name));
 const windows:NativeScheduleWindow[]=[];
 for(let i=0;i<merged.length;i++){
  const s=merged[i], anchor=resolveRecurringAnchor(sunday,s.start,s.end,timezone);
  if(!anchor)return{ok:false,reason:'nativeAnchorUnavailable',required:merged.length};
  windows.push({id:`weekly-${i}-${s.start}-${s.end}`,...anchor});
 }
 return{ok:true,windows};
}

function resolveRecurringAnchor(sunday:string,start:number,end:number,timezone:string):{start:number;end:number}|null{
 for(const weekShift of [0,-7,7,-14,14]){
  const startDay=addDays(sunday,Math.floor(start/1440)+weekShift);
  const endDay=addDays(sunday,Math.floor(end/1440)+weekShift);
  const resolvedStart=resolveLocalInstant(startDay,start%1440,timezone);
  const resolvedEnd=resolveLocalInstant(endDay,end%1440,timezone);
  const startAt=Date.parse(resolvedStart.instant),endAt=Date.parse(resolvedEnd.instant);
  if(resolvedStart.converged&&resolvedEnd.converged&&endAt>startAt)return{start:startAt,end:endAt};
 }
 return null;
}
