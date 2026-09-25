import type { LocationAuthorizationStatus, LocationProvider } from '../../engine/signals/location/LocationProvider';
export type AwakeSessionState = {
  requested: boolean;
  running: boolean;
  authorization: LocationAuthorizationStatus;
  error: string | null;
};
export class AwakeSession {
  private state: AwakeSessionState;
  constructor(private readonly location: LocationProvider) {
    this.state = {
      requested: false,
      running: location.isWalkKeepAliveActive(),
      authorization: location.getAuthorizationStatus(),
      error: null,
    };
  }
  snapshot(): AwakeSessionState {
    return { ...this.state };
  }
  async reconcile(windowActive: boolean): Promise<AwakeSessionState> {
    this.state = {
      ...this.state,
      requested: windowActive,
      authorization: this.location.getAuthorizationStatus(),
      error: null,
    };
    try {
      if (!windowActive) {
        if (this.location.isWalkKeepAliveActive()) await this.location.stopWalkKeepAlive();
      } else if (this.state.authorization === 'authorizedAlways' && !this.location.isWalkKeepAliveActive()) {
        await this.location.startWalkKeepAlive();
      }
      this.state = { ...this.state, running: this.location.isWalkKeepAliveActive() };
    } catch (error) {
      this.state = {
        ...this.state,
        running: this.location.isWalkKeepAliveActive(),
        error: error instanceof Error ? error.message : 'Location session failed',
      };
    }
    return this.snapshot();
  }
}
