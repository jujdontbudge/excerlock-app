import { useSyncExternalStore } from "react";
import type {
  ActivitySelectionMetadata,
  DeviceActivitySelectionSheetViewPersisted,
} from "react-native-device-activity";

import type { ScreenTimeSelectionHandle } from "./ScreenTimeModule";
import type { SelectionContents } from "./selectionSummary";
import type { NativeSelectionPicker } from "./NativeSelectionPicker";

type PickerSnapshot = Readonly<{
  requestId: number;
  selection: ScreenTimeSelectionHandle;
}> | null;

type PendingPickerRequest = Readonly<{
  resolve: (selection: SelectionContents | null) => void;
}>;

export class NativeScreenTimePickerCoordinator
  implements NativeSelectionPicker
{
  private readonly listeners = new Set<() => void>();
  private pending: PendingPickerRequest | null = null;
  private selectionContents: SelectionContents | null = null;
  private snapshot: PickerSnapshot = null;
  private nextRequestId = 1;

  public pick(
    selection: ScreenTimeSelectionHandle,
  ): Promise<SelectionContents | null> {
    if (this.pending !== null) {
      throw new Error("A Screen Time picker request is already active");
    }
    this.selectionContents = null;
    this.snapshot = Object.freeze({
      requestId: this.nextRequestId,
      selection,
    });
    this.nextRequestId += 1;
    const result = new Promise<SelectionContents | null>((resolve) => {
      this.pending = { resolve };
    });
    this.emit();
    return result;
  }

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = (): PickerSnapshot => this.snapshot;

  public selectionChanged(metadata: ActivitySelectionMetadata): void {
    this.selectionContents = Object.freeze({
      applicationCount: metadata.applicationCount,
      categoryCount: metadata.categoryCount,
    });
  }

  public dismissed(): void {
    const pending = this.pending;
    if (pending === null) {
      return;
    }
    const settle = () => {
      if (this.pending !== pending) {
        return;
      }
      const result = this.selectionContents;
      this.pending = null;
      this.selectionContents = null;
      this.snapshot = null;
      pending.resolve(result);
      this.emit();
    };
    setTimeout(settle, 150);
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const nativeScreenTimePicker =
  new NativeScreenTimePickerCoordinator();

export function NativeScreenTimePickerHost({
  picker = nativeScreenTimePicker,
}: Readonly<{
  picker?: NativeScreenTimePickerCoordinator;
}>) {
  const request = useSyncExternalStore(
    picker.subscribe,
    picker.getSnapshot,
    picker.getSnapshot,
  );
  if (request === null) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so fake runtimes never touch the native module
  const { DeviceActivitySelectionSheetViewPersisted: Picker } = require(
    "react-native-device-activity",
  ) as {
    DeviceActivitySelectionSheetViewPersisted: typeof DeviceActivitySelectionSheetViewPersisted;
  };

  return (
    <Picker
      key={request.requestId}
      familyActivitySelectionId={request.selection}
      includeEntireCategory={false}
      style={{ width: 1, height: 1, position: "absolute" }}
      onSelectionChange={({ nativeEvent }) => {
        picker.selectionChanged(nativeEvent);
      }}
      onDismissRequest={() => {
        picker.dismissed();
      }}
    />
  );
}
