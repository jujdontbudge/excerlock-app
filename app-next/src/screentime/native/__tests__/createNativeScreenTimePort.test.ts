jest.mock('../deviceActivityApi',()=>({deviceActivityApi:{authorizationStatus:jest.fn(()=>0),requestAuthorization:jest.fn(async()=>undefined),removeFamilyActivitySelectionId:jest.fn()}}));
jest.mock('../NativeScreenTimePickerHost',()=>({nativeScreenTimePicker:{pick:jest.fn()},NativeScreenTimePickerHost:()=>null}));
const mockApi = require('../deviceActivityApi').deviceActivityApi;
const mockPick = require('../NativeScreenTimePickerHost').nativeScreenTimePicker.pick;
import { createNativeScreenTimePort } from '../createNativeScreenTimePort';
const handler={applyLock:jest.fn(async()=>({applied:true})),registerWatchdog:jest.fn(async p=>p),cancelWatchdog:jest.fn(async()=>undefined)};
describe('native ScreenTimePort',()=>{
 beforeEach(()=>{jest.clearAllMocks();mockApi.authorizationStatus.mockReturnValue(0)});
 it('truthfully rereads authorization and exposes prompt busy state',async()=>{mockApi.requestAuthorization.mockImplementation(async()=>{expect(port.requestState().authorizationPromptBusy).toBe(true);mockApi.authorizationStatus.mockReturnValue(2)});const port=createNativeScreenTimePort(handler);expect(port.authorizationStatus()).toBe('notDetermined');expect(await port.requestAuthorization()).toBe('granted');expect(port.requestState().authorizationPromptBusy).toBe(false)});
 it('returns only opaque selection metadata and delegates policy authority',async()=>{mockApi.authorizationStatus.mockReturnValue(2);mockPick.mockResolvedValue({applicationCount:2,categoryCount:1});const port=createNativeScreenTimePort(handler);expect(await port.presentAppPicker()).toEqual({handle:{token:'excerlock.selection.locked.v1'},isEmpty:false});await port.applyLock({state:'noRulesToday'} as never);expect(handler.applyLock).toHaveBeenCalled()});
 it('reports unavailable usage as null without inventing samples',()=>{const port=createNativeScreenTimePort(handler);const cb=jest.fn();port.observeUsage(cb)();expect(cb).toHaveBeenCalledWith(null)});
 it('idempotently erases only the owned native selection id',async()=>{const port=createNativeScreenTimePort(handler);await port.eraseLockedSelection();await port.eraseLockedSelection();expect(mockApi.removeFamilyActivitySelectionId).toHaveBeenNthCalledWith(1,'excerlock.selection.locked.v1');expect(mockApi.removeFamilyActivitySelectionId).toHaveBeenNthCalledWith(2,'excerlock.selection.locked.v1')});
});

it('cancelled picker preserves the previously persisted selection', async () => {
  const { rulesStore } = require('../../../state/rulesStore');
  const prior = { handle: { token: 'excerlock.selection.locked.v1' }, isEmpty: false };
  rulesStore.getState().patch({ lockedApps: prior });
  mockApi.authorizationStatus.mockReturnValue(2); mockPick.mockResolvedValue(null);
  expect(await createNativeScreenTimePort(handler).presentAppPicker()).toEqual(prior);
});
