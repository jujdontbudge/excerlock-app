export interface SupportPort {
  send(category: 'Problem' | 'Question' | 'Idea', message: string): Promise<void>;
}
