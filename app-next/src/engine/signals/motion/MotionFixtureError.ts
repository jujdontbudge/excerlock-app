export class MotionFixtureError extends Error {
  public constructor(
    public readonly code:
      | "ERR_MOTION_DENIED"
      | "ERR_MOTION_RESTRICTED"
      | "ERR_MOTION_UNAVAILABLE",
  ) {
    super(code);
    this.name = "MotionFixtureError";
  }
}
