import type { Unsubscribe } from '../model/models';

export type NotificationResponse = {
  id: string;
  receivedAt: number;
  action: string;
  url: unknown;
};

export interface NotificationResponsesPort {
  last(): Promise<NotificationResponse | null>;
  subscribe(receive: (response: NotificationResponse) => void): Unsubscribe;
  clear(): Promise<void>;
}
