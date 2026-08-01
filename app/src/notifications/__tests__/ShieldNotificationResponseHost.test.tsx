import { render } from "@testing-library/react-native";

import {
  ShieldNotificationResponseHost,
  type ShieldNotificationResponse,
  type ShieldNotificationResponseSource,
} from "../native/ShieldNotificationResponseHost";

function response(
  identifier: string,
  url: unknown,
): ShieldNotificationResponse {
  return {
    identifier,
    data: { url },
  };
}

function source(
  initial: ShieldNotificationResponse | null,
): ShieldNotificationResponseSource & {
  emit(next: ShieldNotificationResponse): void;
  clearLastResponse: jest.Mock;
  remove: jest.Mock;
} {
  let listener: ((next: ShieldNotificationResponse) => void) | undefined;
  const remove = jest.fn();

  return {
    clearLastResponse: jest.fn(),
    emit(next) {
      listener?.(next);
    },
    getLastResponse: () => initial,
    remove,
    subscribe(nextListener) {
      listener = nextListener;
      return remove;
    },
  };
}

describe("ShieldNotificationResponseHost", () => {
  it("routes cold and live shield taps, clears handled state, and unsubscribes", async () => {
    const responses = source(
      response("excerlock.shield.open.balanceEmpty", "excerlock://"),
    );
    const navigate = jest.fn();

    const view = await render(
      <ShieldNotificationResponseHost
        source={responses}
        navigate={navigate}
      />,
    );

    expect(navigate).toHaveBeenCalledWith("/");
    expect(responses.clearLastResponse).toHaveBeenCalledTimes(1);

    responses.emit(
      response(
        "excerlock.shield.open.lockWindow",
        "excerlock://locked-apps",
      ),
    );
    expect(navigate).toHaveBeenLastCalledWith("/locked-apps");
    expect(responses.clearLastResponse).toHaveBeenCalledTimes(2);

    await view.unmount();
    expect(responses.remove).toHaveBeenCalledTimes(1);
  });

  it("rejects unrelated notifications and unrecognized destinations", async () => {
    const responses = source(null);
    const navigate = jest.fn();

    await render(
      <ShieldNotificationResponseHost
        source={responses}
        navigate={navigate}
      />,
    );

    responses.emit(response("weeklyRecap:1", "excerlock://locked-apps"));
    responses.emit(
      response("excerlock.shield.open.balanceEmpty", "https://example.com"),
    );
    responses.emit(
      response("excerlock.shield.open.balanceEmpty", "excerlock://settings"),
    );

    expect(navigate).not.toHaveBeenCalled();
    expect(responses.clearLastResponse).not.toHaveBeenCalled();
  });

  it("routes a scheduled recap tap to its catalog surface", async () => {
    const responses = source(
      response("weeklyRecap:42", "/(tabs)/analysis"),
    );
    const navigate = jest.fn();

    await render(
      <ShieldNotificationResponseHost
        source={responses}
        navigate={navigate}
      />,
    );

    expect(navigate).toHaveBeenCalledWith("/(tabs)/analysis");
    expect(responses.clearLastResponse).toHaveBeenCalledTimes(1);
  });
});
