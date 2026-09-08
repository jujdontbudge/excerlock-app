import { SupportDiagnostics } from '../domain/supportDiagnostics';

export type SupportRequest = {
  category: 'Problem' | 'Question' | 'Idea';
  message: string;
  replyTo: string;
  diagnostics: SupportDiagnostics;
};

export interface SupportPort {
  send(request: SupportRequest): Promise<void>;
}
