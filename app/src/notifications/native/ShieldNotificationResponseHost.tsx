import { useEffect } from "react";

import {
  type NotificationRoute,
} from "../model/catalog";
import { scheduledNotificationDestination } from "./expoNotificationCodec";

export type ShieldNotificationResponse = Readonly<{
  identifier: string;
  data: Readonly<Record<string, unknown>>;
}>;

export interface ShieldNotificationResponseSource {
  getLastResponse(): ShieldNotificationResponse | null;
  clearLastResponse(): void;
  subscribe(
    listener: (response: ShieldNotificationResponse) => void,
  ): () => void;
}

export type ShieldDestination = "/" | "/locked-apps";
export type NotificationDestination = ShieldDestination | NotificationRoute;

export type ShieldNotificationResponseHostProps = Readonly<{
  source: ShieldNotificationResponseSource;
  navigate: (destination: NotificationDestination) => void;
}>;

export function ShieldNotificationResponseHost({
  source,
  navigate,
}: ShieldNotificationResponseHostProps) {
  useEffect(() => {
    const handleResponse = (response: ShieldNotificationResponse) => {
      const destination = notificationDestination(response);
      if (destination === null) {
        return;
      }

      navigate(destination);
      source.clearLastResponse();
    };

    const initialResponse = source.getLastResponse();
    if (initialResponse !== null) {
      handleResponse(initialResponse);
    }

    return source.subscribe(handleResponse);
  }, [navigate, source]);

  return null;
}

export function notificationDestination(
  response: ShieldNotificationResponse,
): NotificationDestination | null {
  return shieldDestination(response) ?? scheduledDestination(response);
}

export function shieldDestination(
  response: ShieldNotificationResponse,
): ShieldDestination | null {
  if (!response.identifier.startsWith("excerlock.shield.open.")) {
    return null;
  }

  switch (response.data.url) {
    case "excerlock://":
      return "/";
    case "excerlock://locked-apps":
      return "/locked-apps";
    default:
      return null;
  }
}

function scheduledDestination(
  response: ShieldNotificationResponse,
): NotificationRoute | null {
  return scheduledNotificationDestination(response.identifier, response.data);
}
