export const isProtectedSessionError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return /interaction is not allowed|errSecInteractionNotAllowed|-25308|protected data.*unavailable/i.test(message);
};

type Availability = { active(): boolean; whenActive(): Promise<void> };

export async function withAvailableSessionStorage<T>(operation: () => Promise<T>, availability: Availability): Promise<T> {
  let attempts = 0;
  for (;;) {
    try { return await operation(); }
    catch (error) {
      if (!isProtectedSessionError(error)) throw error;
      if (!availability.active()) {
        await availability.whenActive();
        attempts = 0;
      } else {
        if (attempts >= 3) throw error;
        attempts += 1;
        await new Promise((done) => setTimeout(done, attempts * 250));
      }
    }
  }
}
