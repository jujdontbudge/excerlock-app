jest.mock('../deviceActivityApi',()=>({deviceActivityApi:{authorizationStatus:jest.fn(()=>0),requestAuthorization:jest.fn(async()=>undefined),removeFamilyActivitySelectionId:jest.fn(),getFamilyActivitySelectionId:jest.fn()}}));
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
  mockApi.getFamilyActivitySelectionId.mockReturnValue(undefined);
  expect(await createNativeScreenTimePort(handler).presentAppPicker()).toEqual(prior);
});

it('treats a persisted FamilyControls payload as a real pick when the sheet metadata is empty', async () => {
  mockApi.authorizationStatus.mockReturnValue(2);
  mockPick.mockResolvedValue({ applicationCount: 0, categoryCount: 0 });
  mockApi.getFamilyActivitySelectionId.mockReturnValue('base64-family-activity-selection');
  expect(await createNativeScreenTimePort(handler).presentAppPicker()).toEqual({
    handle: { token: 'excerlock.selection.locked.v1' },
    isEmpty: false,
  });
});

describe('Lock list opens the picker from any authorization state', () => {
  beforeEach(() => { jest.clearAllMocks(); mockApi.getFamilyActivitySelectionId.mockReturnValue(undefined); });
  it('requests Screen Time authorization first when it was never decided, then presents the picker', async () => {
    mockApi.authorizationStatus.mockReturnValue(0);
    mockApi.requestAuthorization.mockImplementation(async () => { mockApi.authorizationStatus.mockReturnValue(2); });
    mockPick.mockResolvedValue({ applicationCount: 1, categoryCount: 0 });
    const port = createNativeScreenTimePort(handler);
    expect(await port.presentAppPicker()).toEqual({ handle: { token: 'excerlock.selection.locked.v1' }, isEmpty: false });
    expect(mockApi.requestAuthorization).toHaveBeenCalledWith('individual');
    expect(mockPick).toHaveBeenCalledTimes(1);
  });

  it('rereads authorization granted outside this port instead of trusting the cached value', async () => {
    mockApi.authorizationStatus.mockReturnValue(0);
    const port = createNativeScreenTimePort(handler);
    mockApi.authorizationStatus.mockReturnValue(2);
    mockPick.mockResolvedValue({ applicationCount: 1, categoryCount: 0 });
    await port.presentAppPicker();
    expect(mockApi.requestAuthorization).not.toHaveBeenCalled();
    expect(mockPick).toHaveBeenCalledTimes(1);
  });

  it('throws a typed denied error and never opens the picker when Screen Time is off', async () => {
    const { ScreenTimeAuthorizationError } = require('../../ScreenTimeAuthorizationError');
    mockApi.authorizationStatus.mockReturnValue(1);
    const port = createNativeScreenTimePort(handler);
    await expect(port.presentAppPicker()).rejects.toBeInstanceOf(ScreenTimeAuthorizationError);
    await expect(port.presentAppPicker()).rejects.toMatchObject({ status: 'denied' });
    expect(mockPick).not.toHaveBeenCalled();
  });
});
