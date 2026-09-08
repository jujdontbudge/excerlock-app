import { PermissionStatus } from '../../domain/types';

const mockModule = {
  cameraAuthorization: jest.fn<PermissionStatus, []>(),
  requestCameraAccess: jest.fn<Promise<boolean>, []>(),
  start: jest.fn(async () => undefined),
  stop: jest.fn(async () => undefined),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
let mockOptional: unknown = mockModule;
jest.mock('expo', () => ({ requireOptionalNativeModule: () => mockOptional }));
jest.mock('../../../modules/excerlock-gait-vision', () => ({
  getExcerlockGaitVisionPreview: () => () => null,
}));

const { nativeGait } = require('../NativeGait') as typeof import('../NativeGait');

beforeEach(() => {
  mockOptional = mockModule;
  jest.clearAllMocks();
});

it('reads the camera authorization without starting the capture session', async () => {
  mockModule.cameraAuthorization.mockReturnValue('granted');
  await expect(nativeGait()!.permission()).resolves.toBe('granted');
  expect(mockModule.start).not.toHaveBeenCalled();
  expect(mockModule.stop).not.toHaveBeenCalled();
  expect(mockModule.requestCameraAccess).not.toHaveBeenCalled();
});

it.each<[PermissionStatus]>([['denied'], ['restricted']])(
  'reports %s as itself rather than collapsing it to denied by probing',
  async (status) => {
    mockModule.cameraAuthorization.mockReturnValue(status);
    await expect(nativeGait()!.permission()).resolves.toBe(status);
    expect(mockModule.requestCameraAccess).not.toHaveBeenCalled();
  },
);

it.each<[boolean, PermissionStatus]>([
  [true, 'granted'],
  [false, 'denied'],
])('prompts once when the status is notDetermined (granted=%s)', async (granted, expected) => {
  mockModule.cameraAuthorization.mockReturnValue('notDetermined');
  mockModule.requestCameraAccess.mockResolvedValue(granted);
  await expect(nativeGait()!.permission()).resolves.toBe(expected);
  expect(mockModule.requestCameraAccess).toHaveBeenCalledTimes(1);
  expect(mockModule.start).not.toHaveBeenCalled();
});

it('is absent when the local module is not in the binary', () => {
  mockOptional = null;
  expect(nativeGait()).toBeNull();
});
