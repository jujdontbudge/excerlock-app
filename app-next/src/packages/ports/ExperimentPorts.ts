export type PaywallVariant = 'control' | 'variant_b';
export type PaywallVariantExposure = { variant: PaywallVariant; placement: string; flowVariationId: string; generation: number };
export interface PaywallExperimentPort {
  getPaywallVariant(): Promise<PaywallVariant>;
  trackPaywallVariantExposure(input: PaywallVariantExposure): void;
}
export interface SignInRequiredPort {
  isRequired(): Promise<boolean>;
}
