export interface ReviewPresetPort {
  isEnabled(): Promise<boolean>;
  expose(): void;
}
