import type { ConditionCardModel } from "../../model/conditionCards";
import { EventCard } from "./EventCard";
import { RateCard } from "./RateCard";
import { StateCard } from "./StateCard";

/** One condition, in the card variant its kind demands (PRD §3.15 Tab 1). */
export function ConditionCard({
  model,
  onComplete,
  onStartSession,
}: {
  model: ConditionCardModel;
  onComplete: (conditionId: string) => void;
  onStartSession?: (conditionId: string) => void;
}) {
  switch (model.kind) {
    case "event":
      return <EventCard model={model} onComplete={onComplete} />;
    case "state":
      return <StateCard model={model} onStartSession={onStartSession} />;
    case "rate":
      return <RateCard model={model} />;
  }
}
