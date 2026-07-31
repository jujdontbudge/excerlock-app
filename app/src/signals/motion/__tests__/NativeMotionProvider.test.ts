import { NativeMotionProvider } from "../NativeMotionProvider";
import { ContractExcerlockMotionModule } from "../testing/ContractExcerlockMotionModule";
import { runMotionProviderContract } from "../testing/providerContract";

runMotionProviderContract("NativeMotionProvider", () => {
  const motionModule = new ContractExcerlockMotionModule();
  const provider = new NativeMotionProvider(motionModule);
  let currentTimeMs = 0;

  return {
    provider,
    advanceBy(milliseconds) {
      currentTimeMs += milliseconds;
      motionModule.advanceTo(currentTimeMs);
    },
    advanceTo(atMs) {
      currentTimeMs = atMs;
      motionModule.advanceTo(currentTimeMs);
    },
    dispose: () => provider.dispose(),
  };
});
