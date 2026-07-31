import type { ScreenTimeModule } from "../../ScreenTimeModule";
import {
  NativeScreenTimeModule,
  type DeviceActivityApi,
} from "../NativeScreenTimeModule";

function createDeviceActivityApi(): DeviceActivityApi {
  let authorizationStatus: ReturnType<DeviceActivityApi["authorizationStatus"]> =
    0;

  return {
    authorizationStatus: () => authorizationStatus,
    requestAuthorization: jest.fn(async () => {
      authorizationStatus = 2;
    }),
    blockSelection: jest.fn(),
    unblockSelection: jest.fn(),
    configureActions: jest.fn(),
    startMonitoring: jest.fn(async () => undefined),
    stopMonitoring: jest.fn(),
    isShieldActive: jest.fn(() => false),
  };
}

describe("NativeScreenTimeModule", () => {
  it("maps FamilyControls authorization through the existing interface", async () => {
    const deviceActivity = createDeviceActivityApi();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
    });

    await expect(screenTime.getAuthorizationStatus()).resolves.toBe(
      "notDetermined",
    );
    await expect(screenTime.requestAuthorization()).resolves.toBe("approved");
    expect(deviceActivity.requestAuthorization).toHaveBeenCalledWith(
      "individual",
    );
  });
});
