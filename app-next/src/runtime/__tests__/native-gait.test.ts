import { PermissionStatus } from '../../domain/types';

const module = {
  cameraAuthorization: jest.fn<PermissionStatus, []>(),
  requestCameraAccess: jest.fn<Promise<boolean>, []>(),
  start: jest.fn(async () => undefined),
  stop: jest.fn(async () => undefined),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
};
let optional: unknown = module;
jest.mock('expo', () => ({ requireOptionalNativeModule: () => optional }));
jest.mock('../../../modules/excerlock-gait-vision', () => ({
  getExcerlockGaitVisionPreview: () => () => null,
}));

const { nativeGait } = require('../NativeGait') as typeof import('../NativeGait');

beforeEach(() => {
  optional = module;
  jest.clearAllMocks();
});

it('reads the camera authorization without starting the capture session', async () => {
  module.cameraAuthorization.mockReturnValue('granted');
  await expect(nativeGait()!.permission()).resolves.toBe('granted');
  expect(module.start).not.toHaveBeenCalled();
  expect(module.stop).not.toHaveBeenCalled();
  expect(module.requestCameraAccess).not.toHaveBeenCalled();
});

it.each<[PermissionStatus]>([['denied'], ['restricted']])(
  'reports %s as itself rather than collapsing it to denied by probing',
  async (status) => {
    module.cameraAuthorization.mockReturnValue(status);
    await expect(nativeGait()!.permission()).resolves.toBe(status);
    expect(module.requestCameraAccess).not.toHaveBeenCalled();
  },
);

it.each<[boolean, PermissionStatus]>([
  [true, 'granted'],
  [false, 'denied'],
])('prompts once when the status is notDetermined (granted=%s)', async (granted, expected) => {
  module.cameraAuthorization.mockReturnValue('notDetermined');
  module.requestCameraAccess.mockResolvedValue(granted);
  await expect(nativeGait()!.permission()).resolves.toBe(expected);
  expect(module.requestCameraAccess).toHaveBeenCalledTimes(1);
  expect(module.start).not.toHaveBeenCalled();
});

it('is absent when the local module is not in the binary', () => {
  optional = null;
  expect(nativeGait()).toBeNull();
});
