import { useEffect, useRef } from "react";

/** One-shot actions the dev panel fires at whichever screen is mounted. */
export type DevAction =
  | "codeline:forceWrong"
  | "codeline:placeMine"
  | "codeline:lowHp"
  | "codeline:fillBoard"
  | "codeline:timesUp"
  | "codeline:reset"
  | "codeline:dropWrong"
  | "projector:progress"
  | "projector:lowHp"
  | "projector:defeated"
  | "projector:timesUp"
  | "quiz:mc"
  | "quiz:tf"
  | "quiz:match"
  | "quiz:fill"
  | "quiz:reveal"
  | "quiz:next"
  | "quiz:answerCorrect"
  | "staff:fillSet"
  | "staff:save"
  | "staff:fillSession"
  | "staff:create"
  | "staff:openLobby";

const EVENT = "codeline-dev";

export function emitDev(action: DevAction) {
  window.dispatchEvent(new CustomEvent<DevAction>(EVENT, { detail: action }));
}

export function useDevAction(handler: (action: DevAction) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const on = (e: Event) => ref.current((e as CustomEvent<DevAction>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
}
