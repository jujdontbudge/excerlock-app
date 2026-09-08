export interface ReachabilityPort {
  isOnline(): Promise<boolean>;
}
