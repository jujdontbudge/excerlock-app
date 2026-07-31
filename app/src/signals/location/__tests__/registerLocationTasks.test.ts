jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockDefineTask = jest.fn();
const mockIsTaskDefined = jest.fn(() => false);

jest.mock("expo-task-manager", () => ({
  defineTask: mockDefineTask,
  isTaskDefined: mockIsTaskDefined,
}));

describe("Expo location task registration", () => {
  beforeEach(() => {
    jest.resetModules();
    mockDefineTask.mockClear();
    mockIsTaskDefined.mockClear();
  });

  it("defines geofencing and Walk Session tasks at module scope", () => {
    const tasks = require("../registerLocationTasks") as typeof import("../registerLocationTasks");

    expect(mockIsTaskDefined).toHaveBeenCalledWith(tasks.GEOFENCE_TASK_NAME);
    expect(mockIsTaskDefined).toHaveBeenCalledWith(tasks.WALK_LOCATION_TASK_NAME);
    expect(mockDefineTask.mock.calls.map(([taskName]) => taskName)).toEqual([
      tasks.GEOFENCE_TASK_NAME,
      tasks.WALK_LOCATION_TASK_NAME,
    ]);
    expect(
      mockDefineTask.mock.calls.every(([, executor]) =>
        executor instanceof Function,
      ),
    ).toBe(true);
  });
});
