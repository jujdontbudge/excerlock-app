export type FlowOrder = { readonly preBranch: readonly string[]; readonly tail: readonly string[] };
export interface OnboardingFlowPort {
  order(): FlowOrder | null;
  load(): Promise<FlowOrder | null>;
  subscribe(listener: (order: FlowOrder | null) => void): () => void;
}
