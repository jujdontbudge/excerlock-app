import { AppState } from 'react-native';
import type { LocationAuthorizationStatus, LocationProvider } from '../location/LocationProvider';
export type AwakeSessionState = {
  requested: boolean;
  running: boolean;
  authorization: LocationAuthorizationStatus;
  error: string | null;
};
export type ResidencyAnchor = { setWanted(wanted: boolean, foreground: boolean): void };
export class AwakeSession {
  private state: AwakeSessionState;
  constructor(private readonly location: LocationProvider, private readonly residency: ResidencyAnchor | null = null) {
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
      this.residency?.setWanted(windowActive && this.state.running, AppState.currentState === 'active');
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
