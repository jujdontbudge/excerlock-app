import { act, fireEvent, render, screen } from "@testing-library/react-native";

import { SaveGymCard } from "../components/SaveGymCard";

const fix = { lat: 40.741, lon: -73.989, accuracy: 5, atMs: 1_000 };

describe("SaveGymCard", () => {
  it("saves a named gym as a 100 m circle at the current fix", async () => {
    const onSave = jest.fn();
    await render(
      <SaveGymCard
        savedPlaces={[]}
        locate={async () => fix}
        onSave={onSave}
        createId={() => "place-1"}
      />,
    );
    await fireEvent.changeText(screen.getByLabelText("Gym name"), " Campus Rec ");
    await fireEvent.press(screen.getByText("Save my current location"));
    await act(async () => undefined);

    expect(onSave).toHaveBeenCalledWith({
      id: "place-1",
      name: "Campus Rec",
      geofence: { latitude: 40.741, longitude: -73.989, radiusMeters: 100 },
    });
  });

  it("shows why saving failed and keeps the name", async () => {
    const onSave = jest.fn();
    await render(
      <SaveGymCard
        savedPlaces={[]}
        locate={async () => {
          throw new Error("Location authorization is required to save a gym");
        }}
        onSave={onSave}
      />,
    );
    await fireEvent.changeText(screen.getByLabelText("Gym name"), "Gym");
    await fireEvent.press(screen.getByText("Save my current location"));
    await act(async () => undefined);

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText("Could not save: Location authorization is required to save a gym"),
    ).toBeOnTheScreen();
  });

  it("lists saved gyms and stops at five", async () => {
    const places = Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, name: `Gym ${i}` }));
    await render(<SaveGymCard savedPlaces={places} locate={async () => fix} onSave={jest.fn()} />);
    expect(screen.getByText("Your gyms (5/5)")).toBeOnTheScreen();
    expect(screen.getByText("Gym 4")).toBeOnTheScreen();
    expect(screen.queryByLabelText("Gym name")).toBeNull();
  });
});
