import type { ScreenTimeModule } from "../../ScreenTimeModule";
import {
  NativeScreenTimeModule,
  type DeviceActivityApi,
  type NativeSelectionPicker,
} from "../NativeScreenTimeModule";

function createDeviceActivityApi(initialAuthorizationStatus = 0): DeviceActivityApi {
  let authorizationStatus: ReturnType<DeviceActivityApi["authorizationStatus"]> =
    initialAuthorizationStatus as ReturnType<
      DeviceActivityApi["authorizationStatus"]
    >;

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

function createPicker(
  result: Awaited<ReturnType<NativeSelectionPicker["pick"]>>,
): NativeSelectionPicker {
  return { pick: jest.fn(async () => result) };
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

  it("returns only an opaque persisted picker handle and a count summary", async () => {
    const picker = createPicker({ applicationCount: 4, categoryCount: 2 });
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity: createDeviceActivityApi(2),
      picker,
    });

    const selection = await screenTime.pickSelection();

    expect(selection).toBe("excerlock.selection.locked.v1");
    expect(picker.pick).toHaveBeenCalledWith(selection);
    await expect(screenTime.describeSelection(selection!)).resolves.toEqual({
      handle: selection,
      displayName: "4 apps · 2 categories",
      applicationCount: 4,
      categoryCount: 2,
    });
  });

  it("keeps the existing selection unchanged when the system picker cancels", async () => {
    const selected = createPicker({ applicationCount: 1, categoryCount: 0 });
    const screenTime = new NativeScreenTimeModule({
      deviceActivity: createDeviceActivityApi(2),
      picker: selected,
    });
    const selection = (await screenTime.pickSelection())!;

    selected.pick = jest.fn(async () => null);

    await expect(screenTime.pickSelection()).resolves.toBeNull();
    await expect(screenTime.describeSelection(selection)).resolves.toMatchObject({
      displayName: "1 app",
    });
  });
});
