import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { PickerContext } from "@excerlock/condition-model";

import { FixtureGymSearchClient } from "@/signals";

import { builderCatalog, findOption, type CatalogOption } from "../builderCatalog";
import type { GymSetup } from "../gymSetup";
import { GymStep } from "../steps/GymStep";
import type { SavedPlace } from "../../store/homeState";

const EMPTY: PickerContext = { conditions: [], connectedSources: [], savedPlaceIds: [] };

function gymArrival(context: PickerContext = EMPTY): CatalogOption {
  const option = findOption(builderCatalog(context), "gym-arrival");
  if (option === undefined) {
    throw new Error("No gym-arrival option");
  }
  return option;
}

const fix = { lat: 40.741, lon: -73.989, accuracy: 5, atMs: 1_000 };

function setupStub(overrides: Partial<GymSetup> = {}): GymSetup {
  const search = new FixtureGymSearchClient();
  return {
    savedPlaces: [],
    locate: async () => fix,
    search: (query) => search.search(query),
    save: jest.fn(),
    rename: jest.fn(),
    remove: jest.fn(),
    createId: () => "place-1",
    ...overrides,
  };
}

async function renderStep({
  option = gymArrival(),
  setup = setupStub(),
  onPick = jest.fn(),
  selectedPlaceId,
}: {
  option?: CatalogOption;
  setup?: GymSetup;
  onPick?: (placeId: string) => void;
  selectedPlaceId?: string;
} = {}) {
  await render(
    <GymStep
      option={option}
      setup={setup}
      onPick={onPick}
      {...(selectedPlaceId === undefined ? {} : { selectedPlaceId })}
    />,
  );
  return { setup, onPick };
}

const homeGym: SavedPlace = {
  id: "gym-home",
  name: "Home gym",
  geofence: { latitude: 40.741, longitude: -73.989, radiusMeters: 100 },
};

describe("GymStep", () => {
  it("picks a gym the user already saved", async () => {
    const { onPick } = await renderStep({ setup: setupStub({ savedPlaces: [homeGym] }) });

    await fireEvent.press(screen.getByLabelText("Home gym"));

    expect(onPick).toHaveBeenCalledWith("gym-home");
  });

  it("saves a searched gym as a 100 m circle and picks it", async () => {
    const { setup, onPick } = await renderStep();

    await fireEvent.changeText(screen.getByLabelText("Search for a gym"), "iron");
    await fireEvent.press(screen.getByText("Search"));
    await act(async () => undefined);

    expect(screen.getByText("412 Green St, Champaign, IL")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Iron Works Gym"));

    expect(setup.save).toHaveBeenCalledWith({
      id: "place-1",
      name: "Iron Works Gym",
      geofence: { latitude: 40.1105, longitude: -88.2284, radiusMeters: 100 },
    });
    expect(onPick).toHaveBeenCalledWith("place-1");
  });

  it("keeps the name the user typed over the one the search found", async () => {
    const { setup } = await renderStep();

    await fireEvent.changeText(screen.getByLabelText("Gym name"), "  My gym  ");
    await fireEvent.changeText(screen.getByLabelText("Search for a gym"), "iron");
    await fireEvent.press(screen.getByText("Search"));
    await act(async () => undefined);
    await fireEvent.press(screen.getByLabelText("Iron Works Gym"));

    expect(setup.save).toHaveBeenCalledWith(expect.objectContaining({ name: "My gym" }));
  });

  it("says so when a search finds nothing", async () => {
    await renderStep();

    await fireEvent.changeText(screen.getByLabelText("Search for a gym"), "atlantis");
    await fireEvent.press(screen.getByText("Search"));
    await act(async () => undefined);

    expect(screen.getByText('No gyms found for "atlantis".')).toBeOnTheScreen();
  });

  it("saves the gym the user is standing in", async () => {
    const { setup, onPick } = await renderStep();

    await fireEvent.changeText(screen.getByLabelText("Gym name"), " Campus Rec ");
    await fireEvent.press(screen.getByText("Use my current location"));
    await act(async () => undefined);

    expect(setup.save).toHaveBeenCalledWith({
      id: "place-1",
      name: "Campus Rec",
      geofence: { latitude: 40.741, longitude: -73.989, radiusMeters: 100 },
    });
    expect(onPick).toHaveBeenCalledWith("place-1");
  });

  it("shows why the location fix failed and keeps the name", async () => {
    const { setup } = await renderStep({
      setup: setupStub({
        locate: async () => {
          throw new Error("Location authorization is required to save a gym");
        },
      }),
    });

    await fireEvent.changeText(screen.getByLabelText("Gym name"), "Gym");
    await fireEvent.press(screen.getByText("Use my current location"));
    await act(async () => undefined);

    expect(setup.save).not.toHaveBeenCalled();
    expect(
      screen.getByText("Could not save: Location authorization is required to save a gym"),
    ).toBeOnTheScreen();
  });

  it("will not take a current-location fix without a name", async () => {
    const { setup } = await renderStep();

    await fireEvent.press(screen.getByText("Use my current location"));
    await act(async () => undefined);

    expect(setup.save).not.toHaveBeenCalled();
  });

  it("renames a saved gym", async () => {
    const { setup } = await renderStep({ setup: setupStub({ savedPlaces: [homeGym] }) });

    await fireEvent.press(screen.getByLabelText("Rename Home gym"));
    await fireEvent.changeText(screen.getByLabelText("New name for Home gym"), "Iron Works");
    await fireEvent.press(screen.getByText("Save name"));

    expect(setup.rename).toHaveBeenCalledWith("gym-home", "Iron Works");
  });

  it("asks before forgetting a gym, and says what goes with it", async () => {
    const { setup } = await renderStep({ setup: setupStub({ savedPlaces: [homeGym] }) });

    await fireEvent.press(screen.getByLabelText("Remove Home gym"));
    expect(
      screen.getByText("Forget Home gym? Conditions that use it go too."),
    ).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Keep it"));
    expect(setup.remove).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText("Remove Home gym"));
    await fireEvent.press(screen.getByText("Yes, forget it"));
    expect(setup.remove).toHaveBeenCalledWith("gym-home");
  });

  it("stops offering to add a gym once five are saved", async () => {
    const savedPlaces = Array.from({ length: 5 }, (_, index) => ({
      ...homeGym,
      id: `gym-${index}`,
      name: `Gym ${index}`,
    }));
    await renderStep({ setup: setupStub({ savedPlaces }) });

    expect(screen.getByText("Your gyms (5/5)")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Search for a gym")).toBeNull();
    expect(screen.queryByText("Use my current location")).toBeNull();
  });

  it("greys a gym whose condition the user already built, with the picker's reason", async () => {
    const secondGym: SavedPlace = { ...homeGym, id: "gym-two", name: "Second gym" };
    const context: PickerContext = {
      ...EMPTY,
      savedPlaceIds: ["gym-home", "gym-two"],
      conditions: [
        { id: "c1", catalogId: "gym-arrival", source: "location", placeId: "gym-home" },
      ],
    };
    const { onPick } = await renderStep({
      option: gymArrival(context),
      setup: setupStub({ savedPlaces: [homeGym, secondGym] }),
    });

    expect(screen.getByText("Already added for this source and place.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByLabelText("Home gym"));
    expect(onPick).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText("Second gym"));
    expect(onPick).toHaveBeenCalledWith("gym-two");
  });
});
