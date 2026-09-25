export type SupportCategory = 'Problem' | 'Question' | 'Idea';
export type SupportDelivery = { via: 'server' | 'mail' };
export interface SupportPort {
  send(category: SupportCategory, message: string): Promise<SupportDelivery>;
}
