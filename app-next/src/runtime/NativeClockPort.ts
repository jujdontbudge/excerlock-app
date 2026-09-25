import { AppState, type AppStateStatus } from 'react-native';
import type { ClockPort } from '../ports/ClockPort';

export type ClockDeps = Readonly<{ nowMs(): number; timezone(): string; setInterval(cb: () => void, ms: number): ReturnType<typeof setInterval>; clearInterval(id: ReturnType<typeof setInterval>): void; observeAppState(cb: (state: AppStateStatus) => void): { remove(): void }; initialAppState: AppStateStatus }>;
const nativeDeps: ClockDeps = { nowMs: Date.now, timezone: () => Intl.DateTimeFormat().resolvedOptions().timeZone, setInterval: (cb,ms)=>setInterval(cb,ms), clearInterval, observeAppState: cb => AppState.addEventListener('change',cb), initialAppState: AppState.currentState };
export class NativeClockPort implements ClockPort {
  private listeners = new Set<() => void>(); private timer: ReturnType<typeof setInterval>|null=null; private active: boolean; private snapshot: string; private zone: string; private appState: {remove():void}; private disposed=false;
  constructor(private deps: ClockDeps = nativeDeps) { this.active=deps.initialAppState==='active'; this.snapshot=this.isoSecond(deps.nowMs()); this.zone=deps.timezone(); this.appState=deps.observeAppState(s=>this.onAppState(s)); }
  now = (): string => this.snapshot;
  readNow = (): string => new Date(this.deps.nowMs()).toISOString();
  timezone = (): string => this.zone;
  subscribe = (callback:()=>void) => { if(this.disposed) throw new Error('NativeClockPort disposed'); this.listeners.add(callback); this.reconcileTimer(); return ()=>{this.listeners.delete(callback);this.reconcileTimer()}; };
  dispose(){ if(this.disposed)return;this.disposed=true;this.listeners.clear();this.stopTimer();this.appState.remove(); }
  private isoSecond(ms:number){ return new Date(Math.floor(ms/1000)*1000).toISOString(); }
  private publish(){ const next=this.isoSecond(this.deps.nowMs()), zone=this.deps.timezone(); if(next===this.snapshot&&zone===this.zone)return;this.snapshot=next;this.zone=zone;this.listeners.forEach(x=>x()); }
  private onAppState(state:AppStateStatus){this.active=state==='active';if(this.active)this.publish();this.reconcileTimer();}
  private reconcileTimer(){if(this.active&&this.listeners.size&&!this.timer)this.timer=this.deps.setInterval(()=>this.publish(),1000);else if((!this.active||!this.listeners.size)&&this.timer)this.stopTimer();}
  private stopTimer(){if(this.timer){this.deps.clearInterval(this.timer);this.timer=null;}}
}
export function createNativeClockPort(){return new NativeClockPort();}
