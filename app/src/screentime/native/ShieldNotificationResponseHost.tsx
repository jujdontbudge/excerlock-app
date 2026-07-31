import { useEffect } from "react";

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

export type ShieldNotificationResponseHostProps = Readonly<{
  source: ShieldNotificationResponseSource;
  navigate: (destination: ShieldDestination) => void;
}>;

export function ShieldNotificationResponseHost({
  source,
  navigate,
}: ShieldNotificationResponseHostProps) {
  useEffect(() => {
    const handleResponse = (response: ShieldNotificationResponse) => {
      const destination = shieldDestination(response);
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
