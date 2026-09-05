import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { PickerContext } from "@excerlock/condition-model";

import { FixtureGymSearchClient } from "@/signals";

import { ConditionBuilderSheet } from "../ConditionBuilderSheet";
import type { GymSetup } from "../gymSetup";

const EMPTY: PickerContext = { conditions: [], connectedSources: [], savedPlaceIds: [] };

function gymSetup(overrides: Partial<GymSetup> = {}): GymSetup {
  const search = new FixtureGymSearchClient();
  return {
    savedPlaces: [],
    locate: async () => {
      throw new Error("Location authorization is required to save a gym");
    },
    search: (query) => search.search(query),
    save: jest.fn(),
    rename: jest.fn(),
    remove: jest.fn(),
    createId: () => "place-1",
    ...overrides,
  };
}

async function press(name: string): Promise<void> {
  await fireEvent.press(await screen.findByRole("button", { name }));
}

function heading(): string {
  return screen.getAllByRole("header")[0]!.props.children as string;
}

/**
 * The flow the gym picker exists for (#134): a user at home builds a gym rule
 * without ever having stood in the gym, and never sees a setup card hidden
 * below the condition list.
 */
describe("building a gym condition", () => {
  it("offers the gym condition with no gym saved and asks which gym first", async () => {
    const setup = gymSetup();
    await render(
      <ConditionBuilderSheet
        visible
        context={EMPTY}
        gymSetup={setup}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await press("Arrive at gym");
    expect(heading()).toBe("Which gym?");

    await fireEvent.changeText(screen.getByLabelText("Search for a gym"), "iron");
    await press("Search");
    await act(async () => undefined);
    await press("Iron Works Gym");

    expect(setup.save).toHaveBeenCalledWith({
      id: "place-1",
      name: "Iron Works Gym",
      geofence: { latitude: 40.1105, longitude: -88.2284, radiusMeters: 100 },
    });
    expect(heading()).toBe("Set it up");
  });

  it("walks back out through the gym step", async () => {
    await render(
      <ConditionBuilderSheet
        visible
        context={{ ...EMPTY, savedPlaceIds: ["gym-home"] }}
        gymSetup={gymSetup({
          savedPlaces: [
            {
              id: "gym-home",
              name: "Home gym",
              geofence: { latitude: 40.741, longitude: -73.989, radiusMeters: 100 },
            },
          ],
        })}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    await press("Arrive at gym");
    await press("Home gym");
    expect(heading()).toBe("Set it up");

    await press("Back");
    expect(heading()).toBe("Which gym?");

    await press("Back");
    expect(heading()).toBe("Pick a condition");
  });

  it("saves the condition against the gym the user chose", async () => {
    const onSave = jest.fn();
    await render(
      <ConditionBuilderSheet
        visible
        context={{ ...EMPTY, savedPlaceIds: ["gym-home", "gym-two"] }}
        gymSetup={gymSetup({
          savedPlaces: [
            { id: "gym-home", name: "Home gym" },
            { id: "gym-two", name: "Second gym" },
          ],
        })}
        createId={() => "condition-1"}
        onSave={onSave}
        onClose={jest.fn()}
      />,
    );

    await press("Arrive at gym");
    await press("Second gym");
    await press("Rest of day");
    await press("Choose banner");
    await press("Preview");
    await press("Save condition");

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "condition-1",
        catalogId: "gym-arrival",
        source: "location",
        placeId: "gym-two",
      }),
      expect.anything(),
    );
  });
});
