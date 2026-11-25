import type { DraggableSyntheticListeners } from "@dnd-kit/core";
import type { MouseEvent, TouchEvent } from "react";

// Keep native controls usable. The main button deliberately supports both click and drag.
export function useCardDrag(listeners: DraggableSyntheticListeners) {
  function canStart(event: MouseEvent<HTMLElement> | TouchEvent<HTMLElement>) {
    return (
      event.target instanceof Element &&
      !event.target.closest(
        "button:not(.task-card-main), select, input, textarea, a, [data-no-drag]",
      )
    );
  }
  return {
    onMouseDown(event: MouseEvent<HTMLElement>) {
      if (event.button === 0 && canStart(event)) listeners?.onMouseDown?.(event);
    },
    onTouchStart(event: TouchEvent<HTMLElement>) {
      if (canStart(event)) listeners?.onTouchStart?.(event);
    },
  };
}
