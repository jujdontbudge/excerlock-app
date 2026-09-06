import { Session } from '../domain/types';
import { Unsubscribe } from './models';
export interface AuthPort {
  session(): Session;
  signInWithApple(): Promise<Session>;
  signInWithGoogle(): Promise<Session>;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(code: string): Promise<Session>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  subscribe(callback: (session: Session) => void): Unsubscribe;
}
