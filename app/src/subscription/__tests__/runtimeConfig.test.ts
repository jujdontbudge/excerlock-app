import type { ConfigContext } from "expo/config";

import resolveAppConfig from "../../../app.config";
import appJson from "../../../app.json";

describe("Adapty client runtime config", () => {
  const originalPublicKey = process.env.EXPO_PUBLIC_ADAPTY_KEY;
  const originalSecretKey = process.env.ADAPTY_SECRET_KEY;

  afterEach(() => {
    process.env.EXPO_PUBLIC_ADAPTY_KEY = originalPublicKey;
    process.env.ADAPTY_SECRET_KEY = originalSecretKey;
  });

  it("bundles only the public SDK key", () => {
    process.env.EXPO_PUBLIC_ADAPTY_KEY = "public-test-key";
    process.env.ADAPTY_SECRET_KEY = "server-secret-must-not-ship";

    const config = resolveAppConfig({
      config: appJson.expo,
    } as unknown as ConfigContext);

    expect(config.extra?.clientSubscription).toEqual({
      adaptyKey: "public-test-key",
    });
    expect(JSON.stringify(config.extra)).not.toContain(
      "server-secret-must-not-ship",
    );
  });
});
